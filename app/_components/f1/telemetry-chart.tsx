"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TelemetrySample {
  readonly timestamp: string;
  readonly speed: number;
  readonly gear: number;
  readonly rpm: number;
  readonly throttle: number;
  readonly brake: number;
  readonly drs: number | null;
}

interface TelemetrySummary {
  readonly maxSpeed: number;
  readonly avgSpeed: number;
  readonly maxRpm: number;
  readonly durationSeconds: number;
}

interface Props {
  samples: TelemetrySample[];
  driverName: string;
  team: string;
  teamColour: string;
  summary: TelemetrySummary | null;
  raceName: string;
  totalLaps?: number;
}

export function TelemetryChart({ samples, driverName, team, teamColour, summary, raceName, totalLaps }: Props) {
  const actualTotalLaps = totalLaps && totalLaps > 0 ? totalLaps : 1;
  const [startLap, setStartLap] = useState(1);
  const [endLap, setEndLap] = useState(actualTotalLaps);

  useEffect(() => {
    setStartLap(1);
    setEndLap(actualTotalLaps);
  }, [actualTotalLaps]);

  if (!samples || samples.length === 0) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-4 w-full")}>
        <p className="text-sm text-muted-foreground">No telemetry data available.</p>
      </div>
    );
  }

  const getLapStartIndex = (lap: number) => Math.floor((lap - 1) * samples.length / actualTotalLaps);
  const getLapEndIndex = (lap: number) => lap === actualTotalLaps ? samples.length : Math.floor(lap * samples.length / actualTotalLaps);

  const startIndex = getLapStartIndex(startLap);
  const endIndex = getLapEndIndex(endLap);
  const filteredSamples = samples.slice(startIndex, endIndex);

  if (filteredSamples.length === 0) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-4 w-full")}>
        <p className="text-sm text-muted-foreground">No telemetry data available for this lap range.</p>
      </div>
    );
  }

  const width = 800;
  const height = 400;
  const marginLeft = 40;
  const marginRight = 20;
  const chartWidth = width - marginLeft - marginRight;

  const speedTop = 20;
  const speedHeight = 180;
  const speedBottom = speedTop + speedHeight;

  const inputsTop = 230;
  const inputsHeight = 80;
  const inputsBottom = inputsTop + inputsHeight;

  const gearTop = 340;
  const gearHeight = 30;

  const maxSpeed = Math.max(300, Math.ceil(Math.max(...filteredSamples.map(s => s.speed)) / 50) * 50);
  
  const getX = (index: number) => marginLeft + (index / Math.max(1, filteredSamples.length - 1)) * chartWidth;
  const getSpeedY = (speed: number) => speedBottom - (speed / maxSpeed) * speedHeight;
  const getInputsY = (val: number) => inputsBottom - (val / 100) * inputsHeight;

  // Speed path
  const speedPath = filteredSamples.map((s, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getSpeedY(s.speed)}`).join(' ');

  // Throttle path
  const throttlePath = `M ${getX(0)} ${inputsBottom} ` + 
    filteredSamples.map((s, i) => `L ${getX(i)} ${getInputsY(s.throttle)}`).join(' ') + 
    ` L ${getX(filteredSamples.length - 1)} ${inputsBottom} Z`;

  // Brake path
  const brakePath = `M ${getX(0)} ${inputsBottom} ` + 
    filteredSamples.map((s, i) => `L ${getX(i)} ${getInputsY(s.brake)}`).join(' ') + 
    ` L ${getX(filteredSamples.length - 1)} ${inputsBottom} Z`;

  // DRS zones
  const drsZones: { start: number, end: number }[] = [];
  let inDrs = false;
  let drsStart = 0;
  filteredSamples.forEach((s, i) => {
    if (s.drs === 1 && !inDrs) {
      inDrs = true;
      drsStart = i;
    } else if (s.drs !== 1 && inDrs) {
      inDrs = false;
      drsZones.push({ start: drsStart, end: i });
    }
  });
  if (inDrs) {
    drsZones.push({ start: drsStart, end: filteredSamples.length - 1 });
  }

  // Gear colors
  const getGearColor = (gear: number) => {
    const colors = [
      "#525252", // 0: neutral gray
      "#3b82f6", // 1: blue
      "#06b6d4", // 2: cyan
      "#10b981", // 3: green
      "#84cc16", // 4: light green
      "#eab308", // 5: yellow
      "#f97316", // 6: orange
      "#ef4444", // 7: red
      "#b91c1c", // 8: dark red
    ];
    return colors[gear] || colors[0];
  };

  // Y axis ticks for speed
  const speedTicks = [];
  for (let i = 0; i <= maxSpeed; i += 50) {
    speedTicks.push(i);
  }

  // Lap markers
  const lapMarkers = [];
  if (actualTotalLaps > 1) {
    for (let l = startLap; l <= endLap; l++) {
      const lapStartGlobalIndex = getLapStartIndex(l);
      const localIndex = lapStartGlobalIndex - startIndex;
      if (localIndex >= 0 && localIndex < filteredSamples.length) {
        lapMarkers.push({ lap: l, x: getX(localIndex) });
      }
    }
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 w-full flex flex-col gap-4")}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: `#${teamColour}` }} />
          <div>
            <h3 className="text-lg font-semibold text-foreground leading-none">{driverName}</h3>
            <p className="text-sm text-muted-foreground mt-1">{team} • {raceName}</p>
          </div>
        </div>
        {summary && (
          <div className="flex gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Max Speed</span>
              <span className="font-mono text-foreground">{summary.maxSpeed} km/h</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Avg Speed</span>
              <span className="font-mono text-foreground">{summary.avgSpeed} km/h</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Max RPM</span>
              <span className="font-mono text-foreground">{summary.maxRpm}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Duration</span>
              <span className="font-mono text-foreground">{summary.durationSeconds}s</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {actualTotalLaps > 1 && (
        <div className="flex flex-col gap-3 p-3 bg-background rounded-md border border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">From lap</label>
              <input 
                type="number" 
                min={1} 
                max={endLap} 
                value={startLap} 
                onChange={(e) => setStartLap(Math.max(1, Math.min(endLap, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-1 text-sm bg-background border border-border rounded text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">To lap</label>
              <input 
                type="number" 
                min={startLap} 
                max={actualTotalLaps} 
                value={endLap} 
                onChange={(e) => setEndLap(Math.max(startLap, Math.min(actualTotalLaps, parseInt(e.target.value) || actualTotalLaps)))}
                className="w-16 px-2 py-1 text-sm bg-background border border-border rounded text-foreground"
              />
            </div>
            <button 
              onClick={() => { setStartLap(1); setEndLap(actualTotalLaps); }}
              className="px-3 py-1 text-xs bg-muted hover:bg-accent text-foreground rounded"
            >
              Reset
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setStartLap(1); setEndLap(actualTotalLaps); }}
              className="px-3 py-1 text-xs bg-muted hover:bg-accent text-foreground rounded"
            >
              Full Race
            </button>
            <button 
              onClick={() => { setStartLap(Math.max(1, actualTotalLaps - 9)); setEndLap(actualTotalLaps); }}
              className="px-3 py-1 text-xs bg-muted hover:bg-accent text-foreground rounded"
            >
              Last 10 Laps
            </button>
            <button 
              onClick={() => { setStartLap(1); setEndLap(1); }}
              className="px-3 py-1 text-xs bg-muted hover:bg-accent text-foreground rounded"
            >
              First Lap
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="w-full h-auto">
          {/* Lap Markers */}
          {lapMarkers.map(marker => (
            <g key={`lap-marker-${marker.lap}`}>
              <line x1={marker.x} y1={10} x2={marker.x} y2={height} stroke="var(--border)" strokeWidth="1" opacity={0.5} />
              <text x={marker.x + 4} y={18} fill="var(--muted-foreground)" className="text-[10px]">
                Lap {marker.lap}
              </text>
            </g>
          ))}

          {/* Speed Grid & Labels */}
          {speedTicks.map(tick => {
            const y = getSpeedY(tick);
            return (
              <g key={`tick-${tick}`}>
                <line x1={marginLeft} y1={y} x2={width - marginRight} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                <text x={marginLeft - 8} y={y + 3} textAnchor="end" fill="var(--muted-foreground)" className="text-[10px] font-mono">
                  {tick}
                </text>
              </g>
            );
          })}
          <text x={marginLeft} y={speedTop - 8} fill="var(--foreground)" className="text-xs font-medium">Speed (km/h)</text>

          {/* DRS Zones */}
          {drsZones.map((zone, i) => (
            <rect
              key={`drs-${i}`}
              x={getX(zone.start)}
              y={speedTop}
              width={getX(zone.end) - getX(zone.start)}
              height={speedHeight}
              fill="rgba(34, 197, 94, 0.1)"
            />
          ))}

          {/* Speed Line */}
          <path d={speedPath} fill="none" stroke={`#${teamColour}`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* Inputs Panel */}
          <text x={marginLeft} y={inputsTop - 8} fill="var(--foreground)" className="text-xs font-medium">Throttle & Brake (%)</text>
          <line x1={marginLeft} y1={inputsBottom} x2={width - marginRight} y2={inputsBottom} stroke="var(--border)" strokeWidth="1" />
          <line x1={marginLeft} y1={inputsTop} x2={width - marginRight} y2={inputsTop} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
          
          <text x={marginLeft - 8} y={inputsTop + 3} textAnchor="end" fill="var(--muted-foreground)" className="text-[10px] font-mono">100</text>
          <text x={marginLeft - 8} y={inputsBottom + 3} textAnchor="end" fill="var(--muted-foreground)" className="text-[10px] font-mono">0</text>

          <path d={throttlePath} fill="rgba(34, 197, 94, 0.2)" stroke="rgba(34, 197, 94, 0.8)" strokeWidth="1" />
          <path d={brakePath} fill="rgba(239, 68, 68, 0.2)" stroke="rgba(239, 68, 68, 0.8)" strokeWidth="1" />

          {/* Gear Panel */}
          <text x={marginLeft} y={gearTop - 8} fill="var(--foreground)" className="text-xs font-medium">Gear</text>
          {filteredSamples.map((s, i) => {
            const x1 = getX(i);
            const x2 = i < filteredSamples.length - 1 ? getX(i + 1) : x1 + (chartWidth / filteredSamples.length);
            return (
              <rect
                key={`gear-${i}`}
                x={x1}
                y={gearTop}
                width={Math.max(0.5, x2 - x1 + 0.5)}
                height={gearHeight}
                fill={getGearColor(s.gear)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
