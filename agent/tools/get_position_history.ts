/**
 * Tool: get_position_history
 *
 * Returns the full position timeline for all drivers in a session —
 * every position change with its timestamp. This is the data for
 * charting overtakes, retirements, and position battles over the race.
 *
 * The position endpoint records each driver's position at every change.
 * By plotting these over time, you can visualize the full race dynamics.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import { getMostRecentSession, getSession } from "@/lib/f1/session";
import { sessionTtl } from "@/lib/f1/cache";
import type { OpenF1Driver, OpenF1Position } from "@/lib/f1/types";

interface DriverPositionHistory {
  readonly driverNumber: number;
  readonly driverName: string;
  readonly acronym: string;
  readonly team: string;
  readonly teamColour: string;
  readonly positions: readonly {
    readonly timestamp: string;
    readonly position: number;
  }[];
  readonly startPosition: number;
  readonly endPosition: number;
  readonly positionsGained: number;
}

export default defineTool({
  description:
    "Get the full position history for all drivers in a session — every position change over time. Use for charting overtakes and race dynamics. Optionally pass a sessionKey; defaults to most recent race.",

  inputSchema: z.object({
    sessionKey: z
      .number()
      .int()
      .optional()
      .describe("Session key. If omitted, uses the most recent completed race."),
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

    const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));

    const positionsByDriver = new Map<number, { timestamp: string; position: number }[]>();

    for (const pos of positions.sort((a, b) => a.date.localeCompare(b.date))) {
      const driverPositions = positionsByDriver.get(pos.driver_number) ?? [];
      driverPositions.push({ timestamp: pos.date, position: pos.position });
      positionsByDriver.set(pos.driver_number, driverPositions);
    }

    const histories: DriverPositionHistory[] = Array.from(positionsByDriver.entries())
      .map(([driverNumber, posHistory]) => {
        const driver = driverMap.get(driverNumber);
        const start = posHistory[0]?.position ?? 0;
        const end = posHistory[posHistory.length - 1]?.position ?? 0;
        return {
          driverNumber,
          driverName: driver?.full_name ?? `Driver #${driverNumber}`,
          acronym: driver?.name_acronym ?? "???",
          team: driver?.team_name ?? "Unknown",
          teamColour: driver?.team_colour ?? "000000",
          positions: posHistory,
          startPosition: start,
          endPosition: end,
          positionsGained: start - end,
        };
      })
      .sort((a, b) => a.endPosition - b.endPosition);

    const biggestMover = histories.reduce<DriverPositionHistory | null>(
      (best, h) => (best === null || h.positionsGained > best.positionsGained ? h : best),
      null,
    );

    return {
      sessionKey: resolvedKey,
      raceName: sessionInfo?.name ?? "Race",
      totalDrivers: histories.length,
      biggestMover,
      histories,
    };
  },

  toModelOutput(output) {
    const top3 = output.histories.slice(0, 3)
      .map((h) => `${h.endPosition}. ${h.driverName} (started ${h.startPosition}${h.positionsGained > 0 ? `, +${h.positionsGained}` : ""})`)
      .join("; ");
    const mover = output.biggestMover;
    return {
      type: "text",
      value: `Position history: ${top3}. Biggest mover: ${mover?.driverName ?? "N/A"} (+${mover?.positionsGained ?? 0} positions).`,
    };
  },
});
