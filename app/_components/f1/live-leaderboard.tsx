"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface LeaderboardEntry {
  position: number;
  driverNumber: number;
  driverName: string;
  acronym: string;
  team: string;
  teamColour: string;
  gapToLeader: number | null;
  gapToFront: number | null;
  lapsDown: number;
  currentLap: number;
  lastLapTime: string | null;
  lastLapDuration: number | null;
}

export interface LiveLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  raceName: string;
  isLive: boolean;
  currentLap: number;
}

/**
 * Formats the gap to leader in seconds to a standard F1 format (+X.XXXs).
 */
function formatGap(gap: number | null | undefined, lapsDown: number | undefined): string {
  if (lapsDown && lapsDown > 0) return `+${lapsDown} Lap${lapsDown > 1 ? "s" : ""}`;
  if (gap === null || gap === undefined) return "—";
  if (Math.abs(gap) < 0.01) return "LEADER";
  if (gap < 0) return "—";
  return `+${gap.toFixed(3)}s`;
}

/**
 * Renders a live race leaderboard resembling an F1 broadcast timing screen.
 * Displays positions, driver acronyms, gaps to the leader, and last lap times.
 * Includes a pulsing LIVE indicator if the session is currently active.
 */
const VISIBLE_COUNT = 8;

export function LiveLeaderboard({
  leaderboard,
  raceName,
  isLive,
  currentLap,
}: LiveLeaderboardProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? leaderboard : leaderboard.slice(0, VISIBLE_COUNT);
  const hiddenCount = leaderboard.length - VISIBLE_COUNT;

  return (
    <div className="flex flex-col w-full max-w-3xl border border-border rounded-lg overflow-hidden bg-background">
      <div className="flex items-center justify-between p-3 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold tracking-tighter text-foreground uppercase">
            {raceName}
          </h2>
          <span className="text-xs text-muted-foreground font-mono bg-background px-2 py-0.5 rounded-md border border-border">
            LAP {currentLap}
          </span>
        </div>
        {isLive && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold tracking-tighter text-red-500 uppercase">
              Live
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[24px_4px_36px_1fr_80px_80px] gap-3 px-3 py-2 border-b border-border bg-muted/20 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        <div className="text-right">Pos</div>
        <div />
        <div></div>
        <div>Driver</div>
        <div className="text-right">Gap</div>
        <div className="text-right">Last Lap</div>
      </div>

      <div className="flex flex-col divide-y divide-border/50 max-h-[400px] overflow-y-auto">
        {visible.map((entry) => (
          <div
            key={entry.driverNumber}
            className="grid grid-cols-[24px_4px_36px_1fr_80px_80px] gap-3 px-3 py-1.5 items-center hover:bg-card transition-colors group"
          >
            <div className="text-xs font-bold text-foreground text-right tabular-nums">
              {entry.position}
            </div>
            <div
              className="w-1 h-full min-h-[20px] rounded-full"
              style={{ backgroundColor: `#${entry.teamColour}` }}
            />
            <div className="text-xs font-mono font-bold text-foreground">
              {entry.acronym}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-medium text-foreground truncate">
                {entry.driverName}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {entry.team}
              </span>
            </div>
            <div className="text-xs font-mono text-foreground text-right tabular-nums">
              {formatGap(entry.gapToLeader, entry.lapsDown)}
            </div>
            <div className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors text-right tabular-nums">
              {entry.lastLapTime || "—"}
            </div>
          </div>
        ))}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border text-center"
        >
          {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}
