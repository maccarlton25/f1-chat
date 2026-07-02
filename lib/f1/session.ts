/**
 * F1 Session — helpers for resolving OpenF1 session keys.
 *
 * Many OpenF1 endpoints require a session_key. These helpers find the right
 * session automatically — most recent completed, next upcoming, or all
 * sessions for a specific meeting (weekend).
 */

import { f1Fetch } from "./fetch";
import type { OpenF1Session } from "./types";

/**
 * Finds the most recent completed session of a given type (or any type).
 * Returns null if no sessions have started yet this season.
 */
export async function getMostRecentSession(
  sessionName?: string,
): Promise<OpenF1Session | null> {
  const year = new Date().getFullYear();
  const params = new URLSearchParams({ year: String(year) });
  if (sessionName) params.set("session_name", sessionName);

  const sessions = await f1Fetch<OpenF1Session[]>(`/sessions?${params}`, {
    cacheKey: `sessions:${year}:${sessionName ?? "all"}`,
    ttlSeconds: 300,
  });

  const now = new Date();
  const completed = sessions
    .filter((s) => !s.is_cancelled && new Date(s.date_start) < now)
    .sort((a, b) => b.date_start.localeCompare(a.date_start));

  return completed[0] ?? null;
}

/**
 * Finds the next upcoming session of a given type (or any type).
 * Returns null if the season is over.
 */
export async function getNextSession(
  sessionName?: string,
): Promise<OpenF1Session | null> {
  const year = new Date().getFullYear();
  const params = new URLSearchParams({ year: String(year) });
  if (sessionName) params.set("session_name", sessionName);

  const sessions = await f1Fetch<OpenF1Session[]>(`/sessions?${params}`, {
    cacheKey: `sessions:${year}:${sessionName ?? "all"}`,
    ttlSeconds: 300,
  });

  const now = new Date();
  const upcoming = sessions
    .filter((s) => !s.is_cancelled && new Date(s.date_start) > now)
    .sort((a, b) => a.date_start.localeCompare(b.date_start));

  return upcoming[0] ?? null;
}

/**
 * Returns all sessions for a specific meeting (a race weekend).
 * Sorted chronologically so the UI can render a timeline.
 */
export async function getSessionsForMeeting(
  meetingKey: number,
): Promise<OpenF1Session[]> {
  const sessions = await f1Fetch<OpenF1Session[]>(
    `/sessions?meeting_key=${meetingKey}`,
    {
      cacheKey: `sessions:meeting:${meetingKey}`,
      ttlSeconds: 3600,
    },
  );

  return sessions
    .filter((s) => !s.is_cancelled)
    .sort((a, b) => a.date_start.localeCompare(b.date_start));
}

/**
 * Returns all race sessions for a season, sorted chronologically.
 */
export async function getSeasonRaces(year?: number): Promise<OpenF1Session[]> {
  const seasonYear = year ?? new Date().getFullYear();
  const sessions = await f1Fetch<OpenF1Session[]>(
    `/sessions?session_name=Race&year=${seasonYear}`,
    {
      cacheKey: `sessions:races:${seasonYear}`,
      ttlSeconds: 3600,
    },
  );

  return sessions
    .filter((s) => !s.is_cancelled)
    .sort((a, b) => a.date_start.localeCompare(b.date_start));
}

/**
 * Returns all sprint sessions for a season, sorted chronologically.
 * Sprint races award championship points (8-7-6-5-4-3-2-1 for P1-P8).
 */
export async function getSeasonSprints(year?: number): Promise<OpenF1Session[]> {
  const seasonYear = year ?? new Date().getFullYear();
  const sessions = await f1Fetch<OpenF1Session[]>(
    `/sessions?session_name=Sprint&year=${seasonYear}`,
    {
      cacheKey: `sessions:sprints:${seasonYear}`,
      ttlSeconds: 3600,
    },
  );

  return sessions
    .filter((s) => !s.is_cancelled)
    .sort((a, b) => a.date_start.localeCompare(b.date_start));
}

/**
 * Fetches a specific session by its key, with session metadata.
 */
export async function getSession(sessionKey: number): Promise<OpenF1Session | null> {
  const sessions = await f1Fetch<OpenF1Session[]>(
    `/sessions?session_key=${sessionKey}`,
    {
      cacheKey: `session:${sessionKey}`,
      ttlSeconds: 3600,
    },
  );

  return sessions[0] ?? null;
}
