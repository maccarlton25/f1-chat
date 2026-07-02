/**
 * Tool: get_qualifying_breakdown
 *
 * Returns qualifying session results with sector times and speeds.
 * For qualifying sessions, this shows Q1/Q2/Q3 progression based on
 * lap times — fastest lap per driver, sorted by time.
 *
 * Uses the laps endpoint (qualifying laps are recorded per session).
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import { getMostRecentSession, getNextSession, getSession } from "@/lib/f1/session";
import { sessionTtl } from "@/lib/f1/cache";
import type { OpenF1Driver, OpenF1Lap } from "@/lib/f1/types";

interface QualiResult {
  readonly position: number;
  readonly driverNumber: number;
  readonly driverName: string;
  readonly acronym: string;
  readonly team: string;
  readonly teamColour: string;
  readonly bestLapTime: string | null;
  readonly bestLapDuration: number | null;
  readonly sector1: number | null;
  readonly sector2: number | null;
  readonly sector3: number | null;
  readonly topSpeed: number | null;
}

export default defineTool({
  description:
    "Get qualifying breakdown — fastest lap per driver with sector times and top speeds. Optionally pass a sessionKey for a specific qualifying session; defaults to the most recent qualifying.",

  inputSchema: z.object({
    sessionKey: z
      .number()
      .int()
      .optional()
      .describe("Session key for a qualifying session. If omitted, uses the most recent Qualifying."),
  }),

  async execute({ sessionKey }) {
    let resolvedKey = sessionKey;
    let sessionInfo: { name: string; country: string; date: string; endDate: string } | null = null;

    if (resolvedKey === undefined) {
      const recent = await getMostRecentSession("Qualifying");
      if (!recent) {
        const next = await getNextSession("Qualifying");
        if (next) {
          return {
            sessionKey: next.session_key,
            sessionName: `${next.circuit_short_name} Qualifying`,
            country: next.country_name,
            totalDrivers: 0,
            poleSitter: null,
            results: [],
            upcoming: true,
            startDate: next.date_start,
            message: `Qualifying at ${next.circuit_short_name} hasn't happened yet. It starts on ${next.date_start}.`,
          };
        }
        throw new Error("No qualifying sessions found in the current season.");
      }
      resolvedKey = recent.session_key;
      sessionInfo = {
        name: `${recent.circuit_short_name} Qualifying`,
        country: recent.country_name,
        date: recent.date_start,
        endDate: recent.date_end,
      };
    } else {
      const session = await getSession(resolvedKey);
      if (session) {
        sessionInfo = {
          name: `${session.circuit_short_name} Qualifying`,
          country: session.country_name,
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
    const topSpeeds = new Map<number, number>();

    for (const lap of laps) {
      if (lap.is_pit_out_lap || lap.lap_duration === null) continue;

      const current = bestLaps.get(lap.driver_number);
      if (!current || (lap.lap_duration < (current.lap_duration ?? Infinity))) {
        bestLaps.set(lap.driver_number, lap);
      }

      const speeds = [lap.i1_speed, lap.i2_speed, lap.st_speed].filter((s): s is number => s !== null);
      const maxSpeed = Math.max(...speeds, 0);
      if (maxSpeed > (topSpeeds.get(lap.driver_number) ?? 0)) {
        topSpeeds.set(lap.driver_number, maxSpeed);
      }
    }

    const results: QualiResult[] = Array.from(bestLaps.entries())
      .map(([driverNumber, lap]) => {
        const driver = driverMap.get(driverNumber);
        return {
          position: 0,
          driverNumber,
          driverName: driver?.full_name ?? `Driver #${driverNumber}`,
          acronym: driver?.name_acronym ?? "???",
          team: driver?.team_name ?? "Unknown",
          teamColour: driver?.team_colour ?? "000000",
          bestLapTime: lap.lap_time,
          bestLapDuration: lap.lap_duration,
          sector1: lap.duration_sector_1,
          sector2: lap.duration_sector_2,
          sector3: lap.duration_sector_3,
          topSpeed: topSpeeds.get(driverNumber) ?? null,
        };
      })
      .sort((a, b) => (a.bestLapDuration ?? Infinity) - (b.bestLapDuration ?? Infinity))
      .map((r, i) => ({ ...r, position: i + 1 }));

    return {
      sessionKey: resolvedKey,
      sessionName: sessionInfo?.name ?? "Qualifying",
      country: sessionInfo?.country ?? null,
      totalDrivers: results.length,
      poleSitter: results[0] ?? null,
      results,
    };
  },

  toModelOutput(output) {
    const pole = output.poleSitter;
    if (!pole) return { type: "text", value: "No qualifying data available." };
    const top3 = output.results.slice(0, 3)
      .map((r) => `${r.position}. ${r.driverName} — ${r.bestLapTime ?? "N/A"}`)
      .join("; ");
    return {
      type: "text",
      value: `Qualifying: Pole ${pole.driverName} (${pole.team}) ${pole.bestLapTime}. Top 3: ${top3}.`,
    };
  },
});
