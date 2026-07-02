import { cn } from "@/lib/utils";

interface LapEntry {
  lapNumber: number;
  lapTime: string | null;
  lapDuration: number | null;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  speedI1: number | null;
  speedI2: number | null;
  speedSt: number | null;
  isPitOutLap: boolean;
}

interface Props {
  laps: LapEntry[];
  driverName: string;
  team: string;
  teamColour: string;
  fastestLap: { lapNumber: number; lapTime: string; lapDuration: number } | null;
  averageLap: number | null;
  raceName: string;
}

/**
 * Renders an SVG line chart showing lap times over the course of a session.
 * Highlights the fastest lap and indicates pit stops.
 */
export function LapTimeChart({
  laps,
  driverName,
  team,
  teamColour,
  fastestLap,
  averageLap,
  raceName,
}: Props) {
  // Filter valid laps for the Y-axis scale
  const validLaps = laps.filter((l) => l.lapDuration !== null && !l.isPitOutLap) as (LapEntry & { lapDuration: number })[];
  
  if (validLaps.length === 0) {
    return (
      <div className="flex flex-col w-full rounded-lg border border-border bg-card p-6 items-center justify-center text-sm text-muted-foreground">
        No valid lap data available for {driverName}.
      </div>
    );
  }

  const maxLapNumber = Math.max(...laps.map((l) => l.lapNumber));
  const minLapDuration = Math.min(...validLaps.map((l) => l.lapDuration));
  const maxLapDuration = Math.max(...validLaps.map((l) => l.lapDuration));

  // SVG dimensions
  const width = 800;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 40, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Add 5% padding to Y axis
  const yPadding = (maxLapDuration - minLapDuration) * 0.05 || 1;
  const yMin = minLapDuration - yPadding;
  const yMax = maxLapDuration + yPadding;

  // Helper functions to map data to SVG coordinates
  const getX = (lapNumber: number) => padding.left + ((lapNumber - 1) / Math.max(1, maxLapNumber - 1)) * innerWidth;
  const getY = (duration: number) => padding.top + innerHeight - ((duration - yMin) / (yMax - yMin)) * innerHeight;

  // Format seconds to M:SS.mmm
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    return `${s}.${ms.toString().padStart(3, '0')}`;
  };

  // Generate Y-axis grid lines (5 ticks)
  const yTicks = Array.from({ length: 5 }).map((_, i) => {
    const val = yMin + (yMax - yMin) * (i / 4);
    return { value: val, y: getY(val) };
  });

  // Generate X-axis ticks (every 5 or 10 laps depending on length)
  const xTickInterval = maxLapNumber > 40 ? 10 : 5;
  const xTicks = Array.from({ length: Math.floor(maxLapNumber / xTickInterval) + 1 }).map((_, i) => {
    const val = i === 0 ? 1 : i * xTickInterval;
    return { value: val, x: getX(val) };
  });

  // Build the SVG path for the line chart
  // We break the path when there's a pit out lap or missing data
  let pathD = "";
  let isFirstPoint = true;

  laps.forEach((lap) => {
    if (lap.lapDuration !== null && !lap.isPitOutLap) {
      const x = getX(lap.lapNumber);
      const y = getY(lap.lapDuration);
      if (isFirstPoint) {
        pathD += `M ${x} ${y} `;
        isFirstPoint = false;
      } else {
        pathD += `L ${x} ${y} `;
      }
    } else {
      // Break the line
      isFirstPoint = true;
    }
  });

  const colorHex = teamColour.startsWith('#') ? teamColour : `#${teamColour}`;

  return (
    <div className="flex flex-col w-full rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-1.5 h-10 rounded-full" 
            style={{ backgroundColor: colorHex }}
          />
          <div className="flex flex-col">
            <h3 className="text-sm font-medium tracking-tight text-foreground">
              {driverName}
            </h3>
            <span className="text-xs text-muted-foreground">
              {team} • {raceName}
            </span>
          </div>
        </div>
        
        <div className="flex gap-4">
          {fastestLap && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Fastest Lap</span>
              <span className="text-sm font-medium text-foreground" style={{ color: colorHex }}>
                {fastestLap.lapTime} <span className="text-xs text-muted-foreground font-normal">L{fastestLap.lapNumber}</span>
              </span>
            </div>
          )}
          {averageLap && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Pace</span>
              <span className="text-sm font-medium text-foreground">
                {formatTime(averageLap)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto min-w-[500px]"
        >
          {/* Grid lines and Y-axis labels */}
          {yTicks.map((tick, i) => (
            <g key={`y-${i}`}>
              <line 
                x1={padding.left} 
                y1={tick.y} 
                x2={width - padding.right} 
                y2={tick.y} 
                stroke="currentColor" 
                className="text-border" 
                strokeWidth="1" 
                strokeDasharray="4 4"
              />
              <text 
                x={padding.left - 10} 
                y={tick.y} 
                fill="currentColor" 
                className="text-muted-foreground text-[10px]" 
                textAnchor="end" 
                dominantBaseline="middle"
              >
                {formatTime(tick.value)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xTicks.map((tick, i) => (
            <g key={`x-${i}`}>
              <text 
                x={tick.x} 
                y={height - padding.bottom + 20} 
                fill="currentColor" 
                className="text-muted-foreground text-[10px]" 
                textAnchor="middle"
              >
                L{tick.value}
              </text>
            </g>
          ))}

          {/* Data Line */}
          <path 
            d={pathD} 
            fill="none" 
            stroke={colorHex} 
            strokeWidth="2" 
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Pit Stops (Markers at the bottom) */}
          {laps.filter(l => l.isPitOutLap).map((lap) => (
            <g key={`pit-${lap.lapNumber}`}>
              <line 
                x1={getX(lap.lapNumber)} 
                y1={padding.top} 
                x2={getX(lap.lapNumber)} 
                y2={height - padding.bottom} 
                stroke="currentColor" 
                className="text-destructive/30" 
                strokeWidth="1" 
                strokeDasharray="2 2"
              />
              <rect 
                x={getX(lap.lapNumber) - 4} 
                y={height - padding.bottom - 4} 
                width="8" 
                height="8" 
                fill="currentColor" 
                className="text-destructive" 
                rx="2"
              />
              <text 
                x={getX(lap.lapNumber)} 
                y={height - padding.bottom - 10} 
                fill="currentColor" 
                className="text-destructive text-[8px]" 
                textAnchor="middle"
              >
                PIT
              </text>
            </g>
          ))}

          {/* Fastest Lap Highlight */}
          {fastestLap && (
            <g>
              <circle 
                cx={getX(fastestLap.lapNumber)} 
                cy={getY(fastestLap.lapDuration)} 
                r="5" 
                fill={colorHex} 
                stroke="currentColor"
                className="text-card"
                strokeWidth="2"
              />
              <circle 
                cx={getX(fastestLap.lapNumber)} 
                cy={getY(fastestLap.lapDuration)} 
                r="8" 
                fill="none" 
                stroke={colorHex} 
                strokeWidth="1"
                opacity="0.5"
              />
              <text 
                x={getX(fastestLap.lapNumber)} 
                y={getY(fastestLap.lapDuration) - 15} 
                fill={colorHex} 
                className="text-[10px] font-medium" 
                textAnchor="middle"
              >
                {fastestLap.lapTime}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
