import { cn } from "@/lib/utils";

interface DriverPositionHistory {
  driverNumber: number;
  driverName: string;
  acronym: string;
  team: string;
  teamColour: string;
  positions: { timestamp: string; position: number }[];
  startPosition: number;
  endPosition: number;
  positionsGained: number;
}

interface Props {
  histories: DriverPositionHistory[];
  raceName: string;
  biggestMover: DriverPositionHistory | null;
}

/**
 * Renders an SVG multi-line chart showing position changes over the race.
 * Y-axis is inverted (P1 at the top). Highlights the biggest mover.
 */
export function PositionHistoryChart({
  histories,
  raceName,
  biggestMover,
}: Props) {
  if (!histories || histories.length === 0) return null;

  // SVG dimensions
  const width = 800;
  const height = 400;
  const padding = { top: 20, right: 40, bottom: 30, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Find max number of data points to set X scale
  const maxPoints = Math.max(...histories.map(h => h.positions.length));
  
  // Y scale is 1 to 20 (inverted)
  const yMin = 1;
  const yMax = 20;

  // Helper functions to map data to SVG coordinates
  const getX = (index: number) => padding.left + (index / Math.max(1, maxPoints - 1)) * innerWidth;
  // Invert Y: position 1 is at the top (padding.top), position 20 is at the bottom
  const getY = (position: number) => padding.top + ((position - yMin) / (yMax - yMin)) * innerHeight;

  // Generate Y-axis grid lines (every position or every 5 positions)
  const yTicks = [1, 5, 10, 15, 20];

  // Sort histories to draw top 10 and biggest mover last (so they appear on top)
  const sortedHistories = [...histories].sort((a, b) => {
    if (biggestMover && a.driverNumber === biggestMover.driverNumber) return 1;
    if (biggestMover && b.driverNumber === biggestMover.driverNumber) return -1;
    return b.endPosition - a.endPosition; // Lower position (better) drawn later
  });

  return (
    <div className="flex flex-col w-full rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium tracking-tight text-foreground">
            Position History
          </h3>
          <span className="text-xs text-muted-foreground">
            {raceName}
          </span>
        </div>
        
        {biggestMover && (
          <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-md border border-border/50">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Biggest Mover</span>
              <span className="text-xs font-medium text-foreground">
                {biggestMover.driverName}
              </span>
            </div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20">
              +{biggestMover.positionsGained}
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="p-4 w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto min-w-[600px]"
        >
          {/* Grid lines and Y-axis labels */}
          {yTicks.map((pos) => (
            <g key={`y-${pos}`}>
              <line 
                x1={padding.left} 
                y1={getY(pos)} 
                x2={width - padding.right} 
                y2={getY(pos)} 
                stroke="currentColor" 
                className="text-border" 
                strokeWidth="1" 
                strokeDasharray={pos === 1 ? "none" : "4 4"}
              />
              <text 
                x={padding.left - 10} 
                y={getY(pos)} 
                fill="currentColor" 
                className="text-muted-foreground text-[10px] font-medium" 
                textAnchor="end" 
                dominantBaseline="middle"
              >
                P{pos}
              </text>
            </g>
          ))}

          {/* X-axis labels (Start / End) */}
          <text x={padding.left} y={height - 5} fill="currentColor" className="text-muted-foreground text-[10px]" textAnchor="start">Start</text>
          <text x={width - padding.right} y={height - 5} fill="currentColor" className="text-muted-foreground text-[10px]" textAnchor="end">Finish</text>

          {/* Data Lines */}
          {sortedHistories.map((history) => {
            const isTop10 = history.endPosition <= 10;
            const isBiggestMover = biggestMover?.driverNumber === history.driverNumber;
            const isHighlighted = isTop10 || isBiggestMover;
            
            const colorHex = history.teamColour.startsWith('#') ? history.teamColour : `#${history.teamColour}`;
            
            // Build path
            let pathD = "";
            history.positions.forEach((pos, i) => {
              const x = getX(i);
              const y = getY(pos.position);
              if (i === 0) pathD += `M ${x} ${y} `;
              else pathD += `L ${x} ${y} `;
            });

            return (
              <g key={`line-${history.driverNumber}`}>
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke={colorHex} 
                  strokeWidth={isBiggestMover ? "3" : isHighlighted ? "2" : "1"} 
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={isBiggestMover ? 1 : isHighlighted ? 0.8 : 0.2}
                />
                {/* End position label for highlighted drivers */}
                {isHighlighted && history.positions.length > 0 && (
                  <text 
                    x={width - padding.right + 5} 
                    y={getY(history.endPosition)} 
                    fill={colorHex} 
                    className="text-[9px] font-bold" 
                    dominantBaseline="middle"
                  >
                    {history.acronym}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-border bg-card/50 flex flex-wrap gap-3">
        {sortedHistories.filter(h => h.endPosition <= 10 || h.driverNumber === biggestMover?.driverNumber).map(history => {
          const colorHex = history.teamColour.startsWith('#') ? history.teamColour : `#${history.teamColour}`;
          return (
            <div key={`legend-${history.driverNumber}`} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorHex }} />
              <span className="text-[10px] font-medium text-foreground">{history.acronym}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
