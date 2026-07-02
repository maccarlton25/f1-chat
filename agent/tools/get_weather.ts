/**
 * Tool: get_weather
 *
 * Returns weather data for a session — air temperature, track temperature,
 * humidity, pressure, wind direction/speed, and rainfall.
 *
 * The weather endpoint records conditions throughout the session. This tool
 * returns the most recent reading plus a summary of the range.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import { getMostRecentSession, getSession } from "@/lib/f1/session";
import { sessionTtl } from "@/lib/f1/cache";
import type { OpenF1Weather } from "@/lib/f1/types";

export default defineTool({
  description:
    "Get weather conditions for an F1 session — track temp, air temp, humidity, wind, and rainfall. Optionally pass a sessionKey; defaults to most recent session.",

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

    const weather = await f1Fetch<OpenF1Weather[]>(
      `/weather?session_key=${resolvedKey}`,
      {
        cacheKey: `weather:${resolvedKey}`,
        computeTtl: () => sessionTtl(sessionInfo?.date, sessionInfo?.endDate, 30),
      },
    );

    if (weather.length === 0) {
      return {
        sessionKey: resolvedKey,
        raceName: sessionInfo?.name ?? "Session",
        current: null,
        message: "No weather data available for this session.",
      };
    }

    const sorted = weather.sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];

    const trackTemps = sorted.map((w) => w.track_temperature);
    const airTemps = sorted.map((w) => w.air_temperature);
    const hadRain = sorted.some((w) => w.rainfall > 0);

    return {
      sessionKey: resolvedKey,
      raceName: sessionInfo?.name ?? "Session",
      timestamp: latest.date,
      current: {
        airTemp: latest.air_temperature,
        trackTemp: latest.track_temperature,
        humidity: latest.humidity,
        pressure: latest.pressure,
        windDirection: latest.wind_direction,
        windSpeed: latest.wind_speed,
        rainfall: latest.rainfall,
      },
      range: {
        trackTempMin: Math.min(...trackTemps),
        trackTempMax: Math.max(...trackTemps),
        airTempMin: Math.min(...airTemps),
        airTempMax: Math.max(...airTemps),
        hadRain,
      },
      totalReadings: sorted.length,
    };
  },

  toModelOutput(output) {
    if (!output.current) return { type: "text", value: output.message ?? "No weather data." };
    const c = output.current;
    return {
      type: "text",
      value: `Weather: ${c.trackTemp.toFixed(1)}°C track, ${c.airTemp.toFixed(1)}°C air, ${c.humidity}% humidity, ${c.rainfall > 0 ? "rain" : "dry"}, wind ${c.windSpeed} m/s.`,
    };
  },
});
