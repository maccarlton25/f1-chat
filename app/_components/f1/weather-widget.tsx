import React from "react";
import { cn } from "@/lib/utils";
import { Thermometer, Droplet, Wind, Gauge, CloudRain, Sun } from "lucide-react";

export interface WeatherWidgetProps {
  current: {
    airTemp: number;
    trackTemp: number;
    humidity: number;
    pressure: number;
    windDirection: number;
    windSpeed: number;
    rainfall: number;
  };
  range: {
    trackTempMin: number;
    trackTempMax: number;
    airTempMin: number;
    airTempMax: number;
    hadRain: boolean;
  };
  raceName: string;
}

/**
 * Renders a compact weather dashboard widget for an F1 session.
 * Highlights Track Temperature as the most critical metric.
 * Uses color coding to indicate rain (blue) or hot track conditions (amber).
 */
export function WeatherWidget({ current, range, raceName }: WeatherWidgetProps) {
  const isRaining = current.rainfall > 0;
  const isHotTrack = current.trackTemp > 40;

  return (
    <div className="flex flex-col w-full max-w-md border border-border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-card border-b border-border">
        <h2 className="text-sm font-semibold tracking-tighter text-foreground uppercase">
          {raceName} Weather
        </h2>
        <div className="flex items-center gap-1.5">
          {isRaining ? (
            <CloudRain className="w-4 h-4 text-blue-500" />
          ) : (
            <Sun className="w-4 h-4 text-yellow-500" />
          )}
          <span className={cn(
            "text-xs font-bold tracking-tighter uppercase",
            isRaining ? "text-blue-500" : "text-yellow-500"
          )}>
            {isRaining ? "Wet" : "Dry"}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border/50">
        {/* Track Temp (Highlighted) */}
        <div className={cn(
          "flex flex-col p-3 bg-background transition-colors",
          isHotTrack ? "bg-orange-500/5" : ""
        )}>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Thermometer className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Track</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-2xl font-bold tracking-tighter tabular-nums",
              isHotTrack ? "text-orange-500" : "text-foreground"
            )}>
              {current.trackTemp.toFixed(1)}°
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {range.trackTempMin.toFixed(1)}° - {range.trackTempMax.toFixed(1)}°
          </span>
        </div>

        {/* Air Temp */}
        <div className="flex flex-col p-3 bg-background">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Thermometer className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Air</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold tracking-tighter text-foreground tabular-nums">
              {current.airTemp.toFixed(1)}°
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {range.airTempMin.toFixed(1)}° - {range.airTempMax.toFixed(1)}°
          </span>
        </div>

        {/* Rain */}
        <div className={cn(
          "flex flex-col p-3 bg-background transition-colors",
          isRaining ? "bg-blue-500/5" : ""
        )}>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <CloudRain className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Rain</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-xl font-bold tracking-tighter tabular-nums",
              isRaining ? "text-blue-500" : "text-foreground"
            )}>
              {isRaining ? `${current.rainfall.toFixed(1)} mm` : "0.0 mm"}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            {range.hadRain ? "Rain recorded" : "No rain today"}
          </span>
        </div>

        {/* Wind */}
        <div className="flex flex-col p-3 bg-background">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Wind className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Wind</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tighter text-foreground tabular-nums">
              {current.windSpeed.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">m/s</span>
            </span>
            <div 
              className="w-4 h-4 rounded-full border border-border flex items-center justify-center"
              style={{ transform: `rotate(${current.windDirection}deg)` }}
            >
              <div className="w-0.5 h-2 bg-foreground rounded-full -translate-y-0.5" />
            </div>
          </div>
        </div>

        {/* Humidity */}
        <div className="flex flex-col p-3 bg-background">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Droplet className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Humidity</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold tracking-tighter text-foreground tabular-nums">
              {current.humidity.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Pressure */}
        <div className="flex flex-col p-3 bg-background">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Gauge className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Pressure</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold tracking-tighter text-foreground tabular-nums">
              {current.pressure.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">hPa</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
