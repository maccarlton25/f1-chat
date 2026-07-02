import React from "react";
import { cn } from "@/lib/utils";

export interface QualiResult {
  position: number;
  driverNumber: number;
  driverName: string;
  acronym: string;
  team: string;
  teamColour: string;
  bestLapTime: string | null;
  bestLapDuration: number | null;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  topSpeed: number | null;
}

export interface QualifyingBoardProps {
  results: QualiResult[];
  sessionName: string;
  poleSitter: QualiResult | null;
}

/**
 * Formats a sector time to 3 decimal places.
 */
function formatSector(time: number | null): string {
  if (time === null) return "—";
  return time.toFixed(3);
}

/**
 * Renders a detailed qualifying results board.
 * Displays positions, best lap times, sector times, and top speeds.
 * The pole sitter is highlighted with a subtle gold accent.
 */
export function QualifyingBoard({
  results,
  sessionName,
  poleSitter,
}: QualifyingBoardProps) {
  return (
    <div className="flex flex-col w-full max-w-3xl border border-border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-card border-b border-border gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tighter text-foreground uppercase">
            {sessionName} Qualifying
          </h2>
        </div>
        {poleSitter && (
          <div className="flex items-center gap-2 text-xs bg-background px-2 py-1 rounded-md border border-border">
            <span className="text-muted-foreground uppercase tracking-tighter font-medium">Pole</span>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: `#${poleSitter.teamColour}` }}
            />
            <span className="font-bold text-foreground">{poleSitter.driverName}</span>
            <span className="font-mono text-muted-foreground">{poleSitter.bestLapTime}</span>
          </div>
        )}
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[24px_4px_36px_1fr_70px_50px_50px_50px_40px] gap-3 px-3 py-2 border-b border-border bg-muted/20 text-[10px] font-medium text-muted-foreground uppercase tracking-wider overflow-x-auto">
        <div className="text-right">Pos</div>
        <div />
        <div></div>
        <div>Driver</div>
        <div className="text-right">Time</div>
        <div className="text-right">S1</div>
        <div className="text-right">S2</div>
        <div className="text-right">S3</div>
        <div className="text-right">Spd</div>
      </div>

      {/* Table Body */}
      <div className="flex flex-col divide-y divide-border/50 overflow-x-auto">
        {results.map((result) => {
          const isPole = result.position === 1;
          return (
            <div
              key={result.driverNumber}
              className={cn(
                "grid grid-cols-[24px_4px_36px_1fr_70px_50px_50px_50px_40px] gap-3 px-3 py-1.5 items-center transition-colors min-w-[600px]",
                isPole ? "bg-yellow-500/5 hover:bg-yellow-500/10" : "hover:bg-card"
              )}
            >
              <div className={cn(
                "text-xs font-bold text-right tabular-nums",
                isPole ? "text-yellow-500" : "text-foreground"
              )}>
                {result.position}
              </div>
              
              <div
                className="w-1 h-full min-h-[20px] rounded-full"
                style={{ backgroundColor: `#${result.teamColour}` }}
              />
              
              <div className="text-xs font-mono font-bold text-foreground">
                {result.acronym}
              </div>
              
              <div className="flex flex-col truncate">
                <span className="text-xs font-medium text-foreground truncate">
                  {result.driverName}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {result.team}
                </span>
              </div>
              
              <div className={cn(
                "text-xs font-mono font-bold text-right tabular-nums",
                isPole ? "text-yellow-500" : "text-foreground"
              )}>
                {result.bestLapTime || "—"}
              </div>
              
              <div className="text-[10px] font-mono text-muted-foreground text-right tabular-nums border-l border-border/50 pl-2">
                {formatSector(result.sector1)}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground text-right tabular-nums border-l border-border/50 pl-2">
                {formatSector(result.sector2)}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground text-right tabular-nums border-l border-border/50 pl-2">
                {formatSector(result.sector3)}
              </div>
              
              <div className="text-[10px] font-mono text-muted-foreground text-right tabular-nums border-l border-border/50 pl-2">
                {result.topSpeed ? Math.round(result.topSpeed) : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
