/**
 * F1 Points — the F1 championship points system.
 *
 * Used by get_championship_standings to compute driver and constructor
 * standings from race results across the season.
 *
 * Race points:   25-18-15-12-10-8-6-4-2-1 for P1-P10
 * Sprint points:  8-7-6-5-4-3-2-1 for P1-P8
 * Fastest lap:    +1 point if the driver finishes in the top 10
 */

const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

export function racePointsForPosition(position: number): number {
  if (position < 1 || position > RACE_POINTS.length) return 0;
  return RACE_POINTS[position - 1];
}

export function sprintPointsForPosition(position: number): number {
  if (position < 1 || position > SPRINT_POINTS.length) return 0;
  return SPRINT_POINTS[position - 1];
}

/** Points for the fastest lap, only valid if the driver finished in the top 10. */
export function fastestLapPoints(finishingPosition: number): number {
  return finishingPosition >= 1 && finishingPosition <= 10 ? 1 : 0;
}
