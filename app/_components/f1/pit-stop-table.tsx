import React from "react";
import { cn } from "@/lib/utils";

export interface PitStopEntry {
  driverNumber: number;
  driverName: string;
  acronym: string;
  team: string;
  teamColour: string;
  lap: number;
  pitDuration: number;
  laneDuration: number;
  timestamp: string;
}

export interface PitStopTableProps {
  pitStops: PitStopEntry[];
  raceName: string;
  fastestStop: PitStopEntry | null;
  totalStops: number;
}

/**
 * Renders a chronological list of pit stops during a race.
 * Highlights the fastest pit stop of the race with a subtle green accent.
 * Displays lap number, driver details, and the stationary pit duration.
 */
export function PitStopTable({
  pitStops,
  raceName,
  fastestStop,
  totalStops,
}: PitStopTableProps) {
  // Sort pit stops by lap (descending, so most recent is at the top)
  const sortedStops = [...pitStops].sort((a, b) => b.lap - a.lap);

  return (
    <div className="flex flex-col w-full max-w-2xl border border-border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-card border-b border-border gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold tracking-tighter text-foreground uppercase">
            {raceName} Pit Stops
          </h2>
          <span className="text-xs text-muted-foreground font-mono bg-background px-2 py-0.5 rounded-md border border-border">
            {totalStops} STOPS
          </span>
        </div>
        
        {fastestStop && (
          <div className="flex items-center gap-2 text-xs bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20">
            <span className="text-green-600 dark:text-green-400 uppercase tracking-tighter font-medium">Fastest</span>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: `#${fastestStop.teamColour}` }}
            />
            <span className="font-bold text-foreground">{fastestStop.driverName}</span>
            <span className="font-mono font-bold text-green-600 dark:text-green-400">
              {fastestStop.pitDuration.toFixed(2)}s
            </span>
          </div>
        )}
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[32px_4px_36px_1fr_60px] gap-3 px-3 py-2 border-b border-border bg-muted/20 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        <div className="text-right">Lap</div>
        <div />
        <div></div>
        <div>Driver</div>
        <div className="text-right">Stop</div>
      </div>

      {/* Table Body */}
      <div className="flex flex-col divide-y divide-border/50 max-h-[400px] overflow-y-auto">
        {sortedStops.map((stop, index) => {
          const isFastest = fastestStop && stop.driverNumber === fastestStop.driverNumber && stop.lap === fastestStop.lap;
          
          return (
            <div
              key={`${stop.driverNumber}-${stop.lap}-${index}`}
              className={cn(
                "grid grid-cols-[32px_4px_36px_1fr_60px] gap-3 px-3 py-2 items-center transition-colors",
                isFastest ? "bg-green-500/5 hover:bg-green-500/10" : "hover:bg-card"
              )}
            >
              <div className="text-xs font-bold text-foreground text-right tabular-nums">
                {stop.lap}
              </div>
              
              <div
                className="w-1 h-full min-h-[20px] rounded-full"
                style={{ backgroundColor: `#${stop.teamColour}` }}
              />
              
              <div className="text-xs font-mono font-bold text-foreground">
                {stop.acronym}
              </div>
              
              <div className="flex flex-col truncate">
                <span className="text-xs font-medium text-foreground truncate">
                  {stop.driverName}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {stop.team}
                </span>
              </div>
              
              <div className={cn(
                "text-xs font-mono font-bold text-right tabular-nums",
                isFastest ? "text-green-600 dark:text-green-400" : "text-foreground"
              )}>
                {stop.pitDuration.toFixed(1)}s
              </div>
            </div>
          );
        })}
        
        {sortedStops.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No pit stops recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
