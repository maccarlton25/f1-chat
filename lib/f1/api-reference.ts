/**
 * F1 API Reference — gotchas and best practices for the OpenF1 API.
 *
 * This file documents the quirks discovered through testing, so tool
 * descriptions and instructions can reference them without repeating
 * the full explanation each time.
 */

export const F1_API_GOTCHAS = {
  duplicateDrivers:
    "The /drivers endpoint can return duplicate records for the same driver_number. " +
    "Always deduplicate by driver_number before returning.",

  preSeasonTesting:
    "The /meetings endpoint includes Pre-Season Testing sessions (2 rounds in Bahrain). " +
    "These are NOT championship rounds. When showing race schedules or calendars, " +
    "filter them out by checking meeting_name for 'Testing'.",

  sprintPoints:
    "Sprint races award championship points: 8-7-6-5-4-3-2-1 for P1-P8. " +
    "There are 6 sprint races in 2026. Championship standings MUST include " +
    "both race points (25-18-15-12-10-8-6-4-2-1 for P1-P10) AND sprint points.",

  telemetryGarbageData:
    "The /car_data endpoint returns telemetry for the entire session window, " +
    "which can span 20+ hours if practice and race share a session_key. " +
    "Filter to the session's date_start-date_end window and exclude garage " +
    "data (speed=0 AND throttle=0 AND brake=0).",

  gapCalculation:
    "Race gaps must be computed from lap date_start timestamps (start/finish " +
    "line crossing times), NOT from cumulative lap durations. Drivers with " +
    "pit-out laps or null-duration laps have fewer valid laps, making " +
    "cumulative-time gaps negative and wrong. Compare at the same lap number.",

  qualifyingUpcoming:
    "If no qualifying session has been completed yet, the API returns no lap " +
    "data. Return a clear 'hasn't happened yet' message with the upcoming " +
    "session details instead of throwing an error.",

  sessionTypes:
    "A race weekend has these session types: Practice 1, Practice 2, Practice 3, " +
    "Qualifying, Race. Sprint weekends add: Sprint Qualifying, Sprint. " +
    "Sprint weekends have only 1 practice session (no FP2/FP3).",

  positionHistory:
    "The /position endpoint records every position change, not just the final " +
    "position. To get final positions, sort by date and take the last record " +
    "per driver_number. Multiple records per driver is expected.",

  lapTimeFormat:
    "Lap times come as lap_time (string like '1:21.123') and lap_duration " +
    "(seconds as float). Use lap_time for display, lap_duration for computation. " +
    "Pit-out laps have null lap_duration and should be excluded from fastest " +
    "lap calculations.",
} as const;
