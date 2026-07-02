/**
 * Tool: get_live_leaderboard
 *
 * Returns the current race leaderboard — positions, computed gaps to leader,
 * driver info, and the current lap count. This is the tool to call during
 * a live race to see real-time standings.
 *
 * Gaps are computed from lap data (cumulative time difference between
 * drivers on the same lap) since the OpenF1 interval endpoint doesn't
 * return data for 2026 sessions.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import { getMostRecentSession, getSession } from "@/lib/f1/session";
import { sessionTtl } from "@/lib/f1/cache";
import type { OpenF1Driver, OpenF1Position, OpenF1Lap } from "@/lib/f1/types";

interface LeaderboardEntry {
  readonly position: number;
  readonly driverNumber: number;
  readonly driverName: string;
  readonly acronym: string;
  readonly team: string;
  readonly teamColour: string;
  readonly gapToLeader: number | null;
  readonly gapToFront: number | null;
  readonly lapsDown: number;
  readonly currentLap: number;
  readonly lastLapTime: string | null;
  readonly lastLapDuration: number | null;
}

export default defineTool({
  description:
    "Get the live race leaderboard — current positions, gaps to leader, lap count, and last lap times. Use during a live race. Optionally pass a sessionKey; defaults to the most recent session.",

  inputSchema: z.object({
    sessionKey: z
      .number()
      .int()
      .optional()
      .describe("Session key for the race. If omitted, uses the most recent session."),
  }),

  async execute({ sessionKey }) {
    let resolvedKey = sessionKey;
    let sessionInfo: { name: string; country: string; date: string; endDate: string } | null = null;

    if (resolvedKey === undefined) {
      const recent = await getMostRecentSession("Race");
      if (!recent) {
        throw new Error("No race sessions found.");
      }
      resolvedKey = recent.session_key;
      sessionInfo = {
        name: `${recent.circuit_short_name} Grand Prix`,
        country: recent.country_name,
        date: recent.date_start,
        endDate: recent.date_end,
      };
    } else {
      const session = await getSession(resolvedKey);
      if (session) {
        sessionInfo = {
          name: `${session.circuit_short_name} Grand Prix`,
          country: session.country_name,
          date: session.date_start,
          endDate: session.date_end,
        };
      }
    }

    const [positions, drivers, allLaps] = await Promise.all([
      f1Fetch<OpenF1Position[]>(`/position?session_key=${resolvedKey}`, {
        cacheKey: `positions:${resolvedKey}`,
        computeTtl: () => sessionTtl(sessionInfo?.date, sessionInfo?.endDate, 15),
      }),
      f1Fetch<OpenF1Driver[]>(`/drivers?session_key=${resolvedKey}`, {
        cacheKey: `drivers:${resolvedKey}`,
        ttlSeconds: 3600,
      }),
      f1Fetch<OpenF1Lap[]>(`/laps?session_key=${resolvedKey}`, {
        cacheKey: `laps:all:${resolvedKey}`,
        computeTtl: () => sessionTtl(sessionInfo?.date, sessionInfo?.endDate, 15),
      }),
    ]);

    const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

    const finalPositions = new Map<number, number>();
    for (const pos of positions.sort((a, b) => a.date.localeCompare(b.date))) {
      finalPositions.set(pos.driver_number, pos.position);
    }

    const lapsByDriver = new Map<number, OpenF1Lap[]>();
    for (const lap of allLaps) {
      const driverLaps = lapsByDriver.get(lap.driver_number) ?? [];
      driverLaps.push(lap);
      lapsByDriver.set(lap.driver_number, driverLaps);
    }

    for (const laps of lapsByDriver.values()) {
      laps.sort((a, b) => a.lap_number - b.lap_number);
    }

    const leaderDriverNumber = Array.from(finalPositions.entries())
      .find(([, pos]) => pos === 1)?.[0];

    const leaderLaps = leaderDriverNumber
      ? lapsByDriver.get(leaderDriverNumber) ?? []
      : [];

    // Build a map of lap_number → date_start (timestamp when the driver
    // crossed the start/finish line to begin that lap) for the leader.
    // F1 gaps are computed as the time difference between drivers crossing
    // the line on the same lap — not cumulative lap durations.
    const leaderLapStartTimes = new Map<number, number>();
    for (const lap of leaderLaps) {
      leaderLapStartTimes.set(lap.lap_number, new Date(lap.date_start).getTime());
    }
    const leaderLastLapNumber = leaderLaps.length > 0
      ? leaderLaps[leaderLaps.length - 1].lap_number
      : 0;
    const leaderLastLapStart = leaderLapStartTimes.get(leaderLastLapNumber) ?? 0;

    const sortedByPosition = Array.from(finalPositions.entries())
      .map(([driverNumber, position]) => {
        const driver = driverMap.get(driverNumber);
        const driverLaps = lapsByDriver.get(driverNumber) ?? [];
        const lastLap = driverLaps[driverLaps.length - 1];

        // Build lap start times for this driver
        const driverLapStartTimes = new Map<number, number>();
        for (const lap of driverLaps) {
          driverLapStartTimes.set(lap.lap_number, new Date(lap.date_start).getTime());
        }

        const driverLastLapNumber = driverLaps.length > 0
          ? driverLaps[driverLaps.length - 1].lap_number
          : 0;

        let gapToLeader: number | null = null;
        let lapsDown = 0;

        if (position === 1) {
          gapToLeader = 0;
        } else if (leaderLastLapNumber > 0 && leaderLastLapStart > 0) {
          if (driverLastLapNumber >= leaderLastLapNumber) {
            // Same lap — gap is the difference in start times at the leader's last lap
            const driverStartAtLeaderLap = driverLapStartTimes.get(leaderLastLapNumber) ?? 0;
            if (driverStartAtLeaderLap > 0) {
              gapToLeader = (driverStartAtLeaderLap - leaderLastLapStart) / 1000;
            }
          } else {
            // Driver hasn't reached the leader's last lap — they're laps down
            lapsDown = leaderLastLapNumber - driverLastLapNumber;
            const driverStartAtOwnLastLap = driverLapStartTimes.get(driverLastLapNumber) ?? 0;
            const leaderStartAtDriverLastLap = leaderLapStartTimes.get(driverLastLapNumber) ?? 0;
            if (driverStartAtOwnLastLap > 0 && leaderStartAtDriverLastLap > 0) {
              gapToLeader = (driverStartAtOwnLastLap - leaderStartAtDriverLastLap) / 1000;
            }
          }
        }

        return {
          position,
          driverNumber,
          driverName: driver?.full_name ?? `Driver #${driverNumber}`,
          acronym: driver?.name_acronym ?? "???",
          team: driver?.team_name ?? "Unknown",
          teamColour: driver?.team_colour ?? "000000",
          gapToLeader,
          lapsDown: lapsDown > 0 ? lapsDown : 0,
          currentLap: driverLaps.length,
          lastLapTime: lastLap?.lap_time ?? null,
          lastLapDuration: lastLap?.lap_duration ?? null,
        };
      })
      .sort((a, b) => a.position - b.position);

    const entries: LeaderboardEntry[] = sortedByPosition.map((entry, i) => {
      const prev = i > 0 ? sortedByPosition[i - 1] : null;
      const gapToFront = prev?.gapToLeader !== null && prev?.gapToLeader !== undefined && entry.gapToLeader !== null
        ? entry.gapToLeader - prev.gapToLeader
        : null;
      return { ...entry, gapToFront };
    });

    const isLive = sessionInfo
      ? Date.now() >= new Date(sessionInfo.date).getTime() &&
        Date.now() <= new Date(sessionInfo.endDate).getTime()
      : false;

    return {
      sessionKey: resolvedKey,
      raceName: sessionInfo?.name ?? "Race",
      country: sessionInfo?.country ?? null,
      isLive,
      currentLap: leaderLastLapNumber,
      totalFinishers: entries.length,
      leaderboard: entries,
    };
  },

  toModelOutput(output) {
    const top3 = output.leaderboard.slice(0, 3);
    const summary = top3
      .map((e) => {
        if (e.position === 1) return `${e.position}. ${e.driverName} (${e.team})`;
        if (e.lapsDown > 0) return `${e.position}. ${e.driverName} (${e.team}) +${e.lapsDown} Lap`;
        return `${e.position}. ${e.driverName} (${e.team}) +${e.gapToLeader?.toFixed(1)}s`;
      })
      .join("; ");
    return {
      type: "text",
      value: `Lap ${output.currentLap}: ${summary}. ${output.isLive ? "LIVE" : "Final"}.`,
    };
  },
});
