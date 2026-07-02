/**
 * Tool: get_driver_info
 *
 * Returns driver details for a specific session — name, number, team,
 * team color (hex), headshot URL, and country code. If no session key
 * provided, uses the most recent completed session.
 *
 * Can return a single driver (by number) or all drivers on the grid.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import { getMostRecentSession } from "@/lib/f1/session";
import type { OpenF1Driver } from "@/lib/f1/types";

interface DriverInfo {
  readonly driverNumber: number;
  readonly fullName: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly acronym: string;
  readonly team: string;
  readonly teamColour: string;
  readonly headshotUrl: string | null;
  readonly countryCode: string | null;
}

export default defineTool({
  description:
    "Get F1 driver info — name, number, team, team color, headshot. Pass a driverNumber for one driver; omit for all drivers. Optionally pass a sessionKey (defaults to most recent race).",

  inputSchema: z.object({
    driverNumber: z
      .number()
      .int()
      .optional()
      .describe("Car number (e.g. 1 for Verstappen, 4 for Norris). Omit for all drivers."),
    sessionKey: z
      .number()
      .int()
      .optional()
      .describe("Session key. If omitted, uses the most recent completed race."),
  }),

  async execute({ driverNumber, sessionKey }) {
    let resolvedKey = sessionKey;

    if (resolvedKey === undefined) {
      const recent = await getMostRecentSession("Race");
      if (!recent) {
        throw new Error("No completed race sessions found in the current season.");
      }
      resolvedKey = recent.session_key;
    }

    const params = new URLSearchParams({ session_key: String(resolvedKey) });
    if (driverNumber !== undefined) {
      params.set("driver_number", String(driverNumber));
    }

    const drivers = await f1Fetch<OpenF1Driver[]>(
      `/drivers?${params}`,
      {
        cacheKey: `drivers:${resolvedKey}:${driverNumber ?? "all"}`,
        ttlSeconds: 3600,
      },
    );

    const seen = new Set<number>();
    const driverInfos: DriverInfo[] = drivers
      .filter((d) => {
        if (seen.has(d.driver_number)) return false;
        seen.add(d.driver_number);
        return true;
      })
      .map((d) => ({
        driverNumber: d.driver_number,
        fullName: d.full_name,
        firstName: d.first_name,
        lastName: d.last_name,
        acronym: d.name_acronym,
        team: d.team_name,
        teamColour: d.team_colour,
        headshotUrl: d.headshot_url,
        countryCode: d.country_code,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    if (driverInfos.length === 0) {
      return {
        sessionKey: resolvedKey,
        totalDrivers: 0,
        drivers: [],
        error: true,
        message: `No driver found with number ${driverNumber}. Call get_driver_info with no arguments to see all valid driver numbers for the 2026 season.`,
      };
    }

    return {
      sessionKey: resolvedKey,
      totalDrivers: driverInfos.length,
      drivers: driverInfos,
    };
  },

  toModelOutput(output) {
    if (output.totalDrivers === 0) {
      return { type: "text", value: output.message ?? "No drivers found." };
    }
    if (output.drivers.length === 1) {
      const d = output.drivers[0];
      return { type: "text", value: `${d.fullName} (#${d.driverNumber}), ${d.team}.` };
    }
    const list = output.drivers
      .map((d) => `#${d.driverNumber} ${d.acronym} (${d.team})`)
      .join(", ");
    return { type: "text", value: `${output.totalDrivers} drivers: ${list}` };
  },
});
