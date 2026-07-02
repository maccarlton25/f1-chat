/**
 * Tool: get_lap_times
 *
 * Returns lap-by-lap times for a specific driver in a session.
 * Each lap includes sector times, top speeds, and pit-out flag.
 * Also computes the fastest lap and average lap time.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import { getMostRecentSession, getSession } from "@/lib/f1/session";
import { sessionTtl } from "@/lib/f1/cache";
import type { OpenF1Driver, OpenF1Lap } from "@/lib/f1/types";

interface LapEntry {
  readonly lapNumber: number;
  readonly lapTime: string | null;
  readonly lapDuration: number | null;
  readonly sector1: number | null;
  readonly sector2: number | null;
  readonly sector3: number | null;
  readonly speedI1: number | null;
  readonly speedI2: number | null;
  readonly speedSt: number | null;
  readonly isPitOutLap: boolean;
}

export default defineTool({
  description:
    "Get lap times for a specific driver — each lap with sector times and speeds. Requires a driverNumber. Optionally pass a sessionKey; defaults to most recent completed race.",

  inputSchema: z.object({
    driverNumber: z
      .number()
      .int()
      .describe("Car number (e.g. 1 for Verstappen, 4 for Norris, 16 for Leclerc)."),
    sessionKey: z
      .number()
      .int()
      .optional()
      .describe("Session key. If omitted, uses the most recent completed race."),
  }),

  async execute({ driverNumber, sessionKey }) {
    let resolvedKey = sessionKey;
    let sessionInfo: { name: string; country: string; date: string; endDate: string } | null = null;

    if (resolvedKey === undefined) {
      const recent = await getMostRecentSession("Race");
      if (!recent) {
        throw new Error("No completed race sessions found.");
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

    const [laps, drivers] = await Promise.all([
      f1Fetch<OpenF1Lap[]>(
        `/laps?session_key=${resolvedKey}&driver_number=${driverNumber}`,
        {
          cacheKey: `laps:${resolvedKey}:${driverNumber}`,
          computeTtl: () => sessionTtl(sessionInfo?.date, sessionInfo?.endDate, 30),
        },
      ),
      f1Fetch<OpenF1Driver[]>(
        `/drivers?session_key=${resolvedKey}&driver_number=${driverNumber}`,
        {
          cacheKey: `drivers:${resolvedKey}:${driverNumber}`,
          ttlSeconds: 3600,
        },
      ),
    ]);

    const driver = drivers[0];

    if (laps.length === 0) {
      return {
        sessionKey: resolvedKey,
        raceName: sessionInfo?.name ?? "Race",
        country: sessionInfo?.country ?? null,
        driverNumber,
        driverName: driver?.full_name ?? null,
        team: driver?.team_name ?? null,
        totalLaps: 0,
        laps: [],
        fastestLap: null,
        averageLap: null,
        error: true,
        message: `No lap data found for driver #${driverNumber} in this session. This driver number may not exist in the 2026 season — call get_driver_info with no arguments to see all valid driver numbers, then retry with the correct number.`,
      };
    }

    const sorted = laps.sort((a, b) => a.lap_number - b.lap_number);
    const validLaps = sorted.filter((l) => l.lap_duration !== null && !l.is_pit_out_lap);

    const fastestLap = validLaps.reduce<OpenF1Lap | null>(
      (best, lap) =>
        best === null || (lap.lap_duration !== null && best.lap_duration !== null && lap.lap_duration < best.lap_duration)
          ? lap
          : best,
      null,
    );

    const avgDuration = validLaps.length > 0
      ? validLaps.reduce((sum, l) => sum + (l.lap_duration ?? 0), 0) / validLaps.length
      : null;

    const lapEntries: LapEntry[] = sorted.map((lap) => ({
      lapNumber: lap.lap_number,
      lapTime: lap.lap_time,
      lapDuration: lap.lap_duration,
      sector1: lap.duration_sector_1,
      sector2: lap.duration_sector_2,
      sector3: lap.duration_sector_3,
      speedI1: lap.i1_speed,
      speedI2: lap.i2_speed,
      speedSt: lap.st_speed,
      isPitOutLap: lap.is_pit_out_lap,
    }));

    return {
      sessionKey: resolvedKey,
      raceName: sessionInfo?.name ?? "Race",
      country: sessionInfo?.country ?? null,
      driverNumber,
      driverName: driver?.full_name ?? `Driver #${driverNumber}`,
      team: driver?.team_name ?? "Unknown",
      teamColour: driver?.team_colour ?? "000000",
      totalLaps: sorted.length,
      fastestLap: fastestLap
        ? {
            lapNumber: fastestLap.lap_number,
            lapTime: fastestLap.lap_time,
            lapDuration: fastestLap.lap_duration,
          }
        : null,
      averageLap: avgDuration,
      laps: lapEntries,
    };
  },

  toModelOutput(output) {
    if (output.totalLaps === 0) return { type: "text", value: output.message ?? "No lap data." };
    const fl = output.fastestLap;
    return {
      type: "text",
      value: `${output.driverName}: ${output.totalLaps} laps. Fastest: ${fl?.lapTime ?? "N/A"} (lap ${fl?.lapNumber ?? "?"}). Avg: ${output.averageLap?.toFixed(2) ?? "N/A"}s.`,
    };
  },
});
