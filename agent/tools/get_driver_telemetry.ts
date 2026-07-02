/**
 * Tool: get_driver_telemetry
 *
 * Returns car telemetry for a specific driver in a session — speed, gear,
 * RPM, throttle, brake, and DRS. The OpenF1 API records telemetry at
 * ~3.6Hz, so a full race has thousands of data points.
 *
 * To keep the response manageable, this tool returns a sampled subset
 * (every Nth point) plus summary statistics (max speed, avg speed, etc.).
 * The UI component can render a speed/throttle trace from this.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import { getMostRecentSession, getSession } from "@/lib/f1/session";
import { sessionTtl } from "@/lib/f1/cache";
import type { OpenF1CarData, OpenF1Driver } from "@/lib/f1/types";

interface TelemetrySample {
  readonly timestamp: string;
  readonly speed: number;
  readonly gear: number;
  readonly rpm: number;
  readonly throttle: number;
  readonly brake: number;
  readonly drs: number | null;
}

export default defineTool({
  description:
    "Get car telemetry for a driver — speed, gear, RPM, throttle, brake, DRS. Requires a driverNumber. Returns sampled data plus summary stats. Optionally pass a sessionKey; defaults to most recent race.",

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

    const [telemetry, drivers] = await Promise.all([
      f1Fetch<OpenF1CarData[]>(
        `/car_data?session_key=${resolvedKey}&driver_number=${driverNumber}`,
        {
          cacheKey: `telemetry:${resolvedKey}:${driverNumber}`,
          computeTtl: () => sessionTtl(sessionInfo?.date, sessionInfo?.endDate, 5),
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

    if (telemetry.length === 0) {
      return {
        sessionKey: resolvedKey,
        raceName: sessionInfo?.name ?? "Race",
        driverNumber,
        driverName: driver?.full_name ?? `Driver #${driverNumber}`,
        team: driver?.team_name ?? "Unknown",
        teamColour: driver?.team_colour ?? "000000",
        totalDataPoints: 0,
        sampleCount: 0,
        samples: [],
        summary: null,
        error: true,
        message: `No telemetry data found for driver #${driverNumber}. This driver number may not exist in this session — call get_driver_info with no arguments to see all valid driver numbers.`,
      };
    }

    const sorted = telemetry.sort((a, b) => a.date.localeCompare(b.date));

    // Filter to the session's time window only — the API sometimes returns
    // data from practice/qualifying that shares the session_key, producing
    // 20+ hour spans. We also exclude garage data (speed=0 for extended
    // periods) by keeping only data where speed > 0 or brake/throttle > 0.
    const sessionStart = sessionInfo?.date ? new Date(sessionInfo.date).getTime() : 0;
    const sessionEnd = sessionInfo?.endDate ? new Date(sessionInfo.endDate).getTime() : Infinity;

    const raceData = sorted.filter((t) => {
      const ts = new Date(t.date).getTime();
      if (ts < sessionStart - 60000 || ts > sessionEnd + 60000) return false;
      return t.speed > 0 || t.throttle > 0 || t.brake > 0;
    });

    if (raceData.length === 0) {
      return {
        sessionKey: resolvedKey,
        raceName: sessionInfo?.name ?? "Race",
        driverNumber,
        driverName: driver?.full_name ?? `Driver #${driverNumber}`,
        team: driver?.team_name ?? "Unknown",
        teamColour: driver?.team_colour ?? "000000",
        totalDataPoints: 0,
        sampleCount: 0,
        samples: [],
        summary: null,
        message: "No on-track telemetry data found. The session may not have started yet.",
      };
    }

    const speeds = raceData.map((t) => t.speed).filter((s) => s > 0);
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
    const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const maxRpm = Math.max(...raceData.map((t) => t.rpm));

    const sampleRate = Math.max(1, Math.floor(raceData.length / 200));
    const samples: TelemetrySample[] = raceData
      .filter((_, i) => i % sampleRate === 0)
      .map((t) => ({
        timestamp: t.date,
        speed: t.speed,
        gear: t.n_gear,
        rpm: t.rpm,
        throttle: t.throttle,
        brake: t.brake,
        drs: t.drs,
      }));

    return {
      sessionKey: resolvedKey,
      raceName: sessionInfo?.name ?? "Race",
      driverNumber,
      driverName: driver?.full_name ?? `Driver #${driverNumber}`,
      team: driver?.team_name ?? "Unknown",
      teamColour: driver?.team_colour ?? "000000",
      totalDataPoints: raceData.length,
      sampleCount: samples.length,
      samples,
      summary: {
        maxSpeed,
        avgSpeed,
        maxRpm,
        durationSeconds: raceData.length > 1
          ? (new Date(raceData[raceData.length - 1].date).getTime() - new Date(raceData[0].date).getTime()) / 1000
          : 0,
      },
    };
  },

  toModelOutput(output) {
    if (!output.summary) return { type: "text", value: output.message ?? "No telemetry." };
    return {
      type: "text",
      value: `Telemetry for ${output.driverName}: max ${output.summary.maxSpeed} km/h, avg ${output.summary.avgSpeed.toFixed(0)} km/h, ${output.totalDataPoints} data points over ${output.summary.durationSeconds.toFixed(0)}s.`,
    };
  },
});
