/**
 * Tool: get_session_results
 *
 * Returns finishing positions for ANY session type — practice, qualifying,
 * sprint, or race. Uses the position endpoint to extract each driver's
 * final position, then joins with driver info for names and teams.
 *
 * If no session key is provided, uses the most recent completed session
 * of any type.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import { getMostRecentSession, getSession } from "@/lib/f1/session";
import { sessionTtl } from "@/lib/f1/cache";
import type { OpenF1Driver, OpenF1Position } from "@/lib/f1/types";

interface SessionResultEntry {
  readonly position: number;
  readonly driverNumber: number;
  readonly driverName: string;
  readonly acronym: string;
  readonly team: string;
  readonly teamColour: string;
}

export default defineTool({
  description:
    "Get finishing positions for any F1 session (practice, qualifying, sprint, or race). Optionally pass a sessionKey; defaults to the most recent completed session.",

  inputSchema: z.object({
    sessionKey: z
      .number()
      .int()
      .optional()
      .describe("The session key. If omitted, uses the most recent completed session."),
  }),

  async execute({ sessionKey }) {
    let resolvedKey = sessionKey;
    let sessionInfo: { name: string; country: string; date: string; endDate: string; sessionName: string } | null = null;

    if (resolvedKey === undefined) {
      const recent = await getMostRecentSession();
      if (!recent) {
        throw new Error("No completed sessions found in the current season.");
      }
      resolvedKey = recent.session_key;
      sessionInfo = {
        name: `${recent.circuit_short_name} ${recent.session_name}`,
        country: recent.country_name,
        date: recent.date_start,
        endDate: recent.date_end,
        sessionName: recent.session_name,
      };
    } else {
      const session = await getSession(resolvedKey);
      if (session) {
        sessionInfo = {
          name: `${session.circuit_short_name} ${session.session_name}`,
          country: session.country_name,
          date: session.date_start,
          endDate: session.date_end,
          sessionName: session.session_name,
        };
      }
    }

    const [positions, drivers] = await Promise.all([
      f1Fetch<OpenF1Position[]>(`/position?session_key=${resolvedKey}`, {
        cacheKey: `positions:${resolvedKey}`,
        computeTtl: () => sessionTtl(sessionInfo?.date, sessionInfo?.endDate, 30),
      }),
      f1Fetch<OpenF1Driver[]>(`/drivers?session_key=${resolvedKey}`, {
        cacheKey: `drivers:${resolvedKey}`,
        ttlSeconds: 3600,
      }),
    ]);

    const finalPositions = new Map<number, number>();
    for (const pos of positions.sort((a, b) => a.date.localeCompare(b.date))) {
      finalPositions.set(pos.driver_number, pos.position);
    }

    const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

    const results: SessionResultEntry[] = Array.from(finalPositions.entries())
      .map(([driverNumber, position]) => {
        const driver = driverMap.get(driverNumber);
        return {
          position,
          driverNumber,
          driverName: driver?.full_name ?? `Driver #${driverNumber}`,
          acronym: driver?.name_acronym ?? "???",
          team: driver?.team_name ?? "Unknown",
          teamColour: driver?.team_colour ?? "000000",
        };
      })
      .sort((a, b) => a.position - b.position);

    return {
      sessionKey: resolvedKey,
      sessionName: sessionInfo?.sessionName ?? "Session",
      raceName: sessionInfo?.name ?? `Session ${resolvedKey}`,
      country: sessionInfo?.country ?? null,
      totalFinishers: results.length,
      results,
    };
  },

  toModelOutput(output) {
    const top5 = output.results.slice(0, 5);
    const summary = top5
      .map((r) => `${r.position}. ${r.driverName} (${r.team})`)
      .join("; ");
    return {
      type: "text",
      value: `${output.sessionName} at ${output.raceName}: ${summary}. ${output.totalFinishers} drivers finished.`,
    };
  },
});
