/**
 * Tool: get_pit_stops
 *
 * Returns pit stop data for a session — which lap each driver pitted,
 * pit duration, and lane duration. Sorted by driver then lap.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import { getMostRecentSession, getSession } from "@/lib/f1/session";
import { sessionTtl } from "@/lib/f1/cache";
import type { OpenF1Driver, OpenF1PitStop } from "@/lib/f1/types";

interface PitStopEntry {
  readonly driverNumber: number;
  readonly driverName: string;
  readonly acronym: string;
  readonly team: string;
  readonly teamColour: string;
  readonly lap: number;
  readonly pitDuration: number;
  readonly laneDuration: number;
  readonly timestamp: string;
}

export default defineTool({
  description:
    "Get pit stop data for a session — lap, duration, and driver for each stop. Optionally pass a sessionKey; defaults to most recent race. Optionally filter by driverNumber.",

  inputSchema: z.object({
    sessionKey: z
      .number()
      .int()
      .optional()
      .describe("Session key. If omitted, uses the most recent completed race."),
    driverNumber: z
      .number()
      .int()
      .optional()
      .describe("Filter to a specific driver's pit stops."),
  }),

  async execute({ sessionKey, driverNumber }) {
    let resolvedKey = sessionKey;
    let sessionInfo: { name: string; date: string; endDate: string } | null = null;

    if (resolvedKey === undefined) {
      const recent = await getMostRecentSession("Race");
      if (!recent) {
        throw new Error("No completed race sessions found.");
      }
      resolvedKey = recent.session_key;
      sessionInfo = {
        name: `${recent.circuit_short_name} Grand Prix`,
        date: recent.date_start,
        endDate: recent.date_end,
      };
    } else {
      const session = await getSession(resolvedKey);
      if (session) {
        sessionInfo = {
          name: `${session.circuit_short_name} Grand Prix`,
          date: session.date_start,
          endDate: session.date_end,
        };
      }
    }

    const pitParams = new URLSearchParams({ session_key: String(resolvedKey) });
    if (driverNumber !== undefined) {
      pitParams.set("driver_number", String(driverNumber));
    }

    const [pitStops, drivers] = await Promise.all([
      f1Fetch<OpenF1PitStop[]>(`/pit?${pitParams}`, {
        cacheKey: `pit:${resolvedKey}:${driverNumber ?? "all"}`,
        computeTtl: () => sessionTtl(sessionInfo?.date, sessionInfo?.endDate, 15),
      }),
      f1Fetch<OpenF1Driver[]>(`/drivers?session_key=${resolvedKey}`, {
        cacheKey: `drivers:${resolvedKey}`,
        ttlSeconds: 3600,
      }),
    ]);

    const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

    const entries: PitStopEntry[] = pitStops
      .map((stop) => {
        const driver = driverMap.get(stop.driver_number);
        return {
          driverNumber: stop.driver_number,
          driverName: driver?.full_name ?? `Driver #${stop.driver_number}`,
          acronym: driver?.name_acronym ?? "???",
          team: driver?.team_name ?? "Unknown",
          teamColour: driver?.team_colour ?? "000000",
          lap: stop.lap_number,
          pitDuration: stop.pit_duration,
          laneDuration: stop.lane_duration,
          timestamp: stop.date,
        };
      })
      .sort((a, b) => a.lap - b.lap || a.driverName.localeCompare(b.driverName));

    const fastestStop = entries.reduce<PitStopEntry | null>(
      (best, e) => (best === null || e.pitDuration < best.pitDuration ? e : best),
      null,
    );

    return {
      sessionKey: resolvedKey,
      raceName: sessionInfo?.name ?? "Race",
      totalStops: entries.length,
      fastestStop,
      pitStops: entries,
    };
  },

  toModelOutput(output) {
    const fastest = output.fastestStop;
    if (!fastest) return { type: "text", value: "No pit stop data available." };
    return {
      type: "text",
      value: `${output.totalStops} pit stops. Fastest: ${fastest.driverName} — ${fastest.pitDuration.toFixed(1)}s on lap ${fastest.lap}.`,
    };
  },
});
