import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface DriverStanding {
  position: number;
  driverNumber: number;
  driverName: string;
  acronym: string;
  team: string;
  teamColour: string;
  points: number;
  wins: number;
}

export interface ConstructorStanding {
  position: number;
  team: string;
  teamColour: string;
  points: number;
  wins: number;
}

export interface ChampionshipStandingsProps {
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  racesCompleted: number;
  sprintsCompleted: number;
  totalRaces: number;
}

/**
 * Renders the F1 Driver and Constructor Championship standings.
 * Displays two lists side-by-side on desktop (stacked on mobile) showing
 * positions, points, and wins. Top 3 positions are subtly highlighted.
 * Team colors are used as a left border accent to quickly identify teams.
 */
const VISIBLE_COUNT = 8;

export function ChampionshipStandings({
  driverStandings,
  constructorStandings,
  racesCompleted,
  sprintsCompleted,
  totalRaces,
}: ChampionshipStandingsProps) {
  const [driversExpanded, setDriversExpanded] = useState(false);
  const [constructorsExpanded, setConstructorsExpanded] = useState(false);

  const visibleDrivers = driversExpanded ? driverStandings : driverStandings.slice(0, VISIBLE_COUNT);
  const visibleConstructors = constructorsExpanded ? constructorStandings : constructorStandings.slice(0, VISIBLE_COUNT);
  const hiddenDrivers = driverStandings.length - VISIBLE_COUNT;
  const hiddenConstructors = constructorStandings.length - VISIBLE_COUNT;

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="text-lg font-semibold tracking-tighter text-foreground">
          Championship Standings
        </h2>
        <span className="text-xs text-muted-foreground font-mono">
          Round {racesCompleted} / {totalRaces} ({sprintsCompleted} sprints)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium tracking-tighter text-muted-foreground uppercase mb-1">
            Drivers
          </h3>
          <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto">
            {visibleDrivers.map((driver) => (
              <div
                key={driver.driverNumber}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border border-transparent transition-colors",
                  driver.position <= 3 ? "bg-card border-border/50" : "hover:bg-card/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-4 text-xs font-mono text-muted-foreground text-right">
                    {driver.position}
                  </span>
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ backgroundColor: `#${driver.teamColour}` }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground leading-none">
                      {driver.driverName}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {driver.team}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {driver.points}
                  </span>
                  {driver.wins > 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      W: {driver.wins}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {hiddenDrivers > 0 && (
            <button
              onClick={() => setDriversExpanded(!driversExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left py-1"
            >
              {driversExpanded ? "Show fewer" : `Show ${hiddenDrivers} more`}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium tracking-tighter text-muted-foreground uppercase mb-1">
            Constructors
          </h3>
          <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto">
            {visibleConstructors.map((constructor) => (
              <div
                key={constructor.team}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border border-transparent transition-colors",
                  constructor.position <= 3 ? "bg-card border-border/50" : "hover:bg-card/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-4 text-xs font-mono text-muted-foreground text-right">
                    {constructor.position}
                  </span>
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ backgroundColor: `#${constructor.teamColour}` }}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {constructor.team}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {constructor.points}
                  </span>
                  {constructor.wins > 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      W: {constructor.wins}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {hiddenConstructors > 0 && (
            <button
              onClick={() => setConstructorsExpanded(!constructorsExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left py-1"
            >
              {constructorsExpanded ? "Show fewer" : `Show ${hiddenConstructors} more`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
