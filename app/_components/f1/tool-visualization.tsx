/**
 * F1 Tool Visualization Router
 *
 * This component maps tool names to their generative UI visualizations.
 * When the agent calls a tool, eve returns the full structured data from
 * the tool's `execute` function. This router checks the tool name and
 * renders the matching F1 visualization component instead of raw JSON.
 *
 * Tools without a custom visualization return null, and the caller falls
 * back to the default ToolOutput component.
 *
 * This is the core of the generative UI pattern:
 *   - The model sees a text summary (via toModelOutput)
 *   - The UI sees the full structured data (via this router)
 */

"use client";

import { ChampionshipStandings } from "./championship-standings";
import { CircuitMap } from "./circuit-map";
import { DriverCard } from "./driver-card";
import { LapTimeChart } from "./lap-time-chart";
import { LiveLeaderboard } from "./live-leaderboard";
import { PitStopTable } from "./pit-stop-table";
import { PositionHistoryChart } from "./position-history-chart";
import { QualifyingBoard } from "./qualifying-board";
import { TelemetryChart } from "./telemetry-chart";
import { WeatherWidget } from "./weather-widget";
import { WebSearchResults } from "./web-search-results";
import { WeekendTimeline } from "./weekend-timeline";

interface ToolVisualizationProps {
  readonly toolName: string;
  readonly output: unknown;
}

const VISUALIZED_TOOLS = new Set([
  "show_leaderboard",
  "show_standings",
  "show_circuit",
  "show_lap_times",
  "show_telemetry",
  "show_schedule",
  "show_chart",
  "get_qualifying_breakdown",
  "get_pit_stops",
  "get_weather",
  "get_position_history",
  "web_search",
]);

export function hasF1Visualization(toolName: string): boolean {
  return VISUALIZED_TOOLS.has(toolName);
}

export function F1ToolVisualization({ toolName, output }: ToolVisualizationProps) {
  if (!output || typeof output !== "object") return null;
  const data = output as Record<string, unknown>;

  switch (toolName) {
    case "show_standings":
    case "get_championship_standings":
      return (
        <ChampionshipStandings
          driverStandings={data.driverStandings as never}
          constructorStandings={data.constructorStandings as never}
          racesCompleted={data.racesCompleted as number}
          sprintsCompleted={data.sprintsCompleted as number}
          totalRaces={data.totalRaces as number}
        />
      );

    case "show_schedule":
    case "get_weekend_schedule":
      return <WeekendTimeline weekends={data.weekends as never} />;

    case "show_circuit":
    case "get_circuit_info":
      if (data.found === false) return null;
      return (
        <CircuitMap
          circuitImage={data.circuitImage as string}
          circuit={data.circuit as string}
          circuitType={data.circuitType as string}
          country={data.country as string}
          countryCode={data.countryCode as string}
          countryFlag={data.countryFlag as string}
          location={data.location as string}
          meetingName={data.meetingName as string}
          officialName={data.officialName as string}
        />
      );

    case "show_leaderboard":
    case "get_session_results":
      return (
        <LiveLeaderboard
          leaderboard={data.results as never}
          raceName={data.raceName as string}
          isLive={false}
          currentLap={0}
        />
      );

    case "get_qualifying_breakdown":
      return (
        <QualifyingBoard
          results={data.results as never}
          sessionName={data.sessionName as string}
          poleSitter={data.poleSitter as never}
        />
      );

    case "get_fastest_laps":
      return (
        <LapTimeChart
          laps={data.fastestLaps as never}
          driverName={(data.overallFastest as { driverName?: string })?.driverName ?? "Fastest Laps"}
          team=""
          teamColour="ffffff"
          fastestLap={null}
          averageLap={null}
          raceName={data.sessionName as string}
        />
      );

    case "get_live_leaderboard":
      return (
        <LiveLeaderboard
          leaderboard={data.leaderboard as never}
          raceName={data.raceName as string}
          isLive={data.isLive as boolean}
          currentLap={data.currentLap as number}
        />
      );

    case "get_pit_stops":
      return (
        <PitStopTable
          pitStops={data.pitStops as never}
          raceName={data.raceName as string}
          fastestStop={data.fastestStop as never}
          totalStops={data.totalStops as number}
        />
      );

    case "get_weather":
      if (!data.current) return null;
      return (
        <WeatherWidget
          current={data.current as never}
          range={data.range as never}
          raceName={data.raceName as string}
        />
      );

    case "show_lap_times":
    case "get_lap_times":
      return (
        <LapTimeChart
          laps={data.laps as never}
          driverName={data.driverName as string}
          team={data.team as string}
          teamColour={data.teamColour as string}
          fastestLap={data.fastestLap as never}
          averageLap={data.averageLap as number | null}
          raceName={data.raceName as string}
        />
      );

    case "get_position_history":
      return (
        <PositionHistoryChart
          histories={data.histories as never}
          raceName={data.raceName as string}
          biggestMover={data.biggestMover as never}
        />
      );

    case "show_telemetry":
    case "get_driver_telemetry":
      if (!data.samples || (data.samples as unknown[]).length === 0) return null;
      return (
        <TelemetryChart
          samples={data.samples as never}
          driverName={data.driverName as string}
          team={data.team as string}
          teamColour={data.teamColour as string}
          summary={data.summary as never}
          raceName={data.raceName as string}
        />
      );

    case "web_search":
      return (
        <WebSearchResults
          query={data.query as string}
          results={(data.results as never) ?? []}
          error={data.error as boolean}
          message={data.message as string}
        />
      );

    case "show_chart":
      if (!data.imageBase64) return null;
      return (
        <div className="rounded-lg border border-border bg-card p-3 w-full">
          <img
            src={`data:${data.mediaType ?? "image/png"};base64,${data.imageBase64}`}
            alt={data.filename as string}
            className="w-full h-auto rounded-md"
          />
        </div>
      );

    default:
      return null;
  }
}
