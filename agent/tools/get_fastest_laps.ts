/**
 * Tool: get_fastest_laps
 *
 * Returns the fastest lap for each driver in a session, plus the overall
 * fastest lap. Works for any session type — race, qualifying, practice.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import { getMostRecentSession, getSession } from "@/lib/f1/session";
import { sessionTtl } from "@/lib/f1/cache";
import type { OpenF1Driver, OpenF1Lap } from "@/lib/f1/types";

interface FastestLapEntry {
  readonly position: number;
  readonly driverNumber: number;
  readonly driverName: string;
  readonly acronym: string;
  readonly team: string;
  readonly teamColour: string;
  readonly lapTime: string | null;
  readonly lapDuration: number | null;
  readonly lapNumber: number;
  readonly sector1: number | null;
  readonly sector2: number | null;
  readonly sector3: number | null;
}

export default defineTool({
  description:
    "Get fastest laps for a session — each driver's best lap with sector times. Returns the overall fastest lap separately. Optionally pass a sessionKey; defaults to most recent session.",

  inputSchema: z.object({
    sessionKey: z
      .number()
      .int()
      .optional()
      .describe("Session key. If omitted, uses the most recent completed session."),
  }),

  async execute({ sessionKey }) {
    let resolvedKey = sessionKey;
    let sessionInfo: { name: string; date: string; endDate: string } | null = null;

    if (resolvedKey === undefined) {
      const recent = await getMostRecentSession("Race");
      if (!recent) {
        throw new Error("No completed race sessions found.");
      }
      resolvedKey = recent.session_key;
      sessionInfo = {
        name: `${recent.circuit_short_name} ${recent.session_name}`,
        date: recent.date_start,
        endDate: recent.date_end,
      };
    } else {
      const session = await getSession(resolvedKey);
      if (session) {
        sessionInfo = {
          name: `${session.circuit_short_name} ${session.session_name}`,
          date: session.date_start,
          endDate: session.date_end,
        };
      }
    }

    const [laps, drivers] = await Promise.all([
      f1Fetch<OpenF1Lap[]>(`/laps?session_key=${resolvedKey}`, {
        cacheKey: `laps:all:${resolvedKey}`,
        computeTtl: () => sessionTtl(sessionInfo?.date, sessionInfo?.endDate, 30),
      }),
      f1Fetch<OpenF1Driver[]>(`/drivers?session_key=${resolvedKey}`, {
        cacheKey: `drivers:${resolvedKey}`,
        ttlSeconds: 3600,
      }),
    ]);

    const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

    const bestLaps = new Map<number, OpenF1Lap>();
    for (const lap of laps) {
      if (lap.is_pit_out_lap || lap.lap_duration === null) continue;
      const current = bestLaps.get(lap.driver_number);
      if (!current || lap.lap_duration < (current.lap_duration ?? Infinity)) {
        bestLaps.set(lap.driver_number, lap);
      }
    }

    const entries: FastestLapEntry[] = Array.from(bestLaps.entries())
      .map(([driverNumber, lap]) => {
        const driver = driverMap.get(driverNumber);
        return {
          position: 0,
          driverNumber,
          driverName: driver?.full_name ?? `Driver #${driverNumber}`,
          acronym: driver?.name_acronym ?? "???",
          team: driver?.team_name ?? "Unknown",
          teamColour: driver?.team_colour ?? "000000",
          lapTime: lap.lap_time,
          lapDuration: lap.lap_duration,
          lapNumber: lap.lap_number,
          sector1: lap.duration_sector_1,
          sector2: lap.duration_sector_2,
          sector3: lap.duration_sector_3,
        };
      })
      .sort((a, b) => (a.lapDuration ?? Infinity) - (b.lapDuration ?? Infinity))
      .map((r, i) => ({ ...r, position: i + 1 }));

    return {
      sessionKey: resolvedKey,
      sessionName: sessionInfo?.name ?? "Session",
      overallFastest: entries[0] ?? null,
      fastestLaps: entries,
    };
  },

  toModelOutput(output) {
    const fastest = output.overallFastest;
    if (!fastest) return { type: "text", value: "No lap data available." };
    return {
      type: "text",
      value: `Fastest lap: ${fastest.driverName} (${fastest.team}) — ${fastest.lapTime} on lap ${fastest.lapNumber}.`,
    };
  },
});
