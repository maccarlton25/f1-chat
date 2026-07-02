/**
 * Tool: get_championship_standings
 *
 * Computes driver and constructor championship standings by aggregating
 * results from all completed races AND sprint races in the current season.
 *
 * OpenF1 doesn't provide standings directly — we compute them by:
 *   1. Fetching all race + sprint sessions for the season
 *   2. For each completed session, fetching final positions
 *   3. Awarding points: races use 25-18-15-12-10-8-6-4-2-1 (P1-P10),
 *      sprints use 8-7-6-5-4-3-2-1 (P1-P8)
 *   4. Summing per driver and per constructor
 *
 * Driver info (name, team, color) is cached from the first session
 * that has data and reused across all sessions.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import { getSeasonRaces, getSeasonSprints } from "@/lib/f1/session";
import { racePointsForPosition, sprintPointsForPosition } from "@/lib/f1/points";
import type { OpenF1Driver, OpenF1Position } from "@/lib/f1/types";

interface DriverStanding {
  readonly position: number;
  readonly driverNumber: number;
  readonly driverName: string;
  readonly acronym: string;
  readonly team: string;
  readonly teamColour: string;
  readonly points: number;
  readonly wins: number;
}

interface ConstructorStanding {
  readonly position: number;
  readonly team: string;
  readonly teamColour: string;
  readonly points: number;
  readonly wins: number;
}

export default defineTool({
  description:
    "Get current driver and constructor championship standings for the season. Returns both rankings sorted by points. No input needed.",

  inputSchema: z.object({}),

  async execute() {
    const year = new Date().getFullYear();
    const races = await getSeasonRaces(year);
    const sprints = await getSeasonSprints(year);
    const now = new Date();

    const completedRaces = races.filter((r) => new Date(r.date_start) < now);
    const completedSprints = sprints.filter((s) => new Date(s.date_start) < now);

    const driverPoints = new Map<number, number>();
    const driverWins = new Map<number, number>();
    const constructorPoints = new Map<string, number>();
    const constructorWins = new Map<string, number>();
    const driverInfoMap = new Map<number, OpenF1Driver>();

    async function processSession(
      sessionKey: number,
      pointFn: (pos: number) => number,
    ) {
      const [positions, drivers] = await Promise.all([
        f1Fetch<OpenF1Position[]>(
          `/position?session_key=${sessionKey}`,
          { cacheKey: `positions:${sessionKey}`, ttlSeconds: 86400 },
        ),
        f1Fetch<OpenF1Driver[]>(
          `/drivers?session_key=${sessionKey}`,
          { cacheKey: `drivers:${sessionKey}`, ttlSeconds: 86400 },
        ),
      ]);

      for (const d of drivers) {
        if (!driverInfoMap.has(d.driver_number)) {
          driverInfoMap.set(d.driver_number, d);
        }
      }

      const finalPositions = new Map<number, number>();
      for (const pos of positions.sort((a, b) => a.date.localeCompare(b.date))) {
        finalPositions.set(pos.driver_number, pos.position);
      }

      for (const [driverNumber, position] of finalPositions) {
        const pts = pointFn(position);
        driverPoints.set(driverNumber, (driverPoints.get(driverNumber) ?? 0) + pts);
        if (position === 1) {
          driverWins.set(driverNumber, (driverWins.get(driverNumber) ?? 0) + 1);
        }

        const driver = driverInfoMap.get(driverNumber);
        if (driver) {
          constructorPoints.set(
            driver.team_name,
            (constructorPoints.get(driver.team_name) ?? 0) + pts,
          );
          if (position === 1) {
            constructorWins.set(
              driver.team_name,
              (constructorWins.get(driver.team_name) ?? 0) + 1,
            );
          }
        }
      }
    }

    for (const race of completedRaces) {
      await processSession(race.session_key, racePointsForPosition);
    }

    for (const sprint of completedSprints) {
      await processSession(sprint.session_key, sprintPointsForPosition);
    }

    const driverStandings: DriverStanding[] = Array.from(driverPoints.entries())
      .map(([driverNumber, points]) => {
        const driver = driverInfoMap.get(driverNumber);
        return {
          position: 0,
          driverNumber,
          driverName: driver?.full_name ?? `Driver #${driverNumber}`,
          acronym: driver?.name_acronym ?? "???",
          team: driver?.team_name ?? "Unknown",
          teamColour: driver?.team_colour ?? "000000",
          points,
          wins: driverWins.get(driverNumber) ?? 0,
        };
      })
      .sort((a, b) => b.points - a.points)
      .map((s, i) => ({ ...s, position: i + 1 }));

    const constructorColours = new Map<string, string>();
    for (const driver of driverInfoMap.values()) {
      if (!constructorColours.has(driver.team_name)) {
        constructorColours.set(driver.team_name, driver.team_colour);
      }
    }

    const constructorStandings: ConstructorStanding[] = Array.from(constructorPoints.entries())
      .map(([team, points]) => ({
        position: 0,
        team,
        teamColour: constructorColours.get(team) ?? "000000",
        points,
        wins: constructorWins.get(team) ?? 0,
      }))
      .sort((a, b) => b.points - a.points)
      .map((s, i) => ({ ...s, position: i + 1 }));

    return {
      year,
      racesCompleted: completedRaces.length,
      sprintsCompleted: completedSprints.length,
      totalRaces: races.length,
      driverStandings,
      constructorStandings,
    };
  },

  toModelOutput(output) {
    const top5 = output.driverStandings.slice(0, 5);
    const top3Teams = output.constructorStandings.slice(0, 3);
    const driverSummary = top5
      .map((d) => `${d.position}. ${d.driverName} (${d.team}) — ${d.points} pts`)
      .join("; ");
    const teamSummary = top3Teams
      .map((t) => `${t.position}. ${t.team} — ${t.points} pts`)
      .join("; ");
    return {
      type: "text",
      value: `Championship after ${output.racesCompleted} races + ${output.sprintsCompleted} sprints. Drivers: ${driverSummary}. Constructors: ${teamSummary}.`,
    };
  },
});
