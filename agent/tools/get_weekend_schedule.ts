/**
 * Tool: get_weekend_schedule
 *
 * Returns the full weekend schedule for a race meeting — all sessions
 * (Practice 1-3, Sprint Qualifying, Sprint, Qualifying, Race) with their
 * start/end times, circuit info, and country.
 *
 * If no meeting key is provided, returns all meetings for the season.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import type { OpenF1Meeting, OpenF1Session } from "@/lib/f1/types";

interface WeekendSession {
  readonly sessionKey: number;
  readonly sessionName: string;
  readonly sessionType: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly circuit: string;
  readonly country: string;
  readonly countryCode: string;
  readonly location: string;
}

interface WeekendSchedule {
  readonly meetingKey: number;
  readonly meetingName: string;
  readonly officialName: string;
  readonly circuit: string;
  readonly circuitImage: string;
  readonly country: string;
  readonly countryCode: string;
  readonly countryFlag: string;
  readonly location: string;
  readonly circuitType: string;
  readonly weekendStart: string;
  readonly weekendEnd: string;
  readonly sessions: readonly WeekendSession[];
}

export default defineTool({
  description:
    "Get the weekend schedule for an F1 round — all practice, qualifying, sprint, and race sessions with times. ALWAYS pass either a meetingKey or a circuit name. Never call with no arguments — that returns the entire season which is not useful. Pass circuit='Silverstone' or circuit='Melbourne' for a specific round.",

  inputSchema: z.object({
    meetingKey: z
      .number()
      .int()
      .optional()
      .describe("The meeting key for a specific round."),
    circuit: z
      .string()
      .optional()
      .describe("Circuit short name to find a specific round (e.g. 'Silverstone', 'Melbourne', 'Monaco'). Use this when you don't have a meetingKey."),
    next: z
      .boolean()
      .optional()
      .describe("Set to true to get only the next upcoming race weekend. Use this when the user asks about 'the next race' or 'this weekend'."),
    year: z
      .number()
      .int()
      .optional()
      .describe("Season year. Defaults to current year."),
  }),

  async execute({ meetingKey, circuit, next, year }) {
    const seasonYear = year ?? new Date().getFullYear();

    if (meetingKey !== undefined) {
      const meetings = await f1Fetch<OpenF1Meeting[]>(
        `/meetings?meeting_key=${meetingKey}`,
        { cacheKey: `meeting:${meetingKey}`, ttlSeconds: 3600 },
      );
      const meeting = meetings[0];
      if (!meeting) {
        return { weekends: [], message: "Meeting not found." };
      }

      const sessions = await f1Fetch<OpenF1Session[]>(
        `/sessions?meeting_key=${meetingKey}`,
        { cacheKey: `sessions:meeting:${meetingKey}`, ttlSeconds: 3600 },
      );

      const sortedSessions = sessions
        .filter((s) => !s.is_cancelled)
        .sort((a, b) => a.date_start.localeCompare(b.date_start));

      const weekend: WeekendSchedule = {
        meetingKey: meeting.meeting_key,
        meetingName: meeting.meeting_name,
        officialName: meeting.meeting_official_name,
        circuit: meeting.circuit_short_name,
        circuitImage: meeting.circuit_image,
        country: meeting.country_name,
        countryCode: meeting.country_code,
        countryFlag: meeting.country_flag,
        location: meeting.location,
        circuitType: meeting.circuit_type,
        weekendStart: meeting.date_start,
        weekendEnd: meeting.date_end,
        sessions: sortedSessions.map<WeekendSession>((s) => ({
          sessionKey: s.session_key,
          sessionName: s.session_name,
          sessionType: s.session_type,
          startDate: s.date_start,
          endDate: s.date_end,
          circuit: s.circuit_short_name,
          country: s.country_name,
          countryCode: s.country_code,
          location: s.location,
        })),
      };

      return { weekends: [weekend] };
    }

    const meetings = await f1Fetch<OpenF1Meeting[]>(
      `/meetings?year=${seasonYear}`,
      { cacheKey: `meetings:${seasonYear}`, ttlSeconds: 3600 },
    );

    let filtered = meetings.filter((m) => !m.is_cancelled);

    if (circuit) {
      const lowerCircuit = circuit.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.circuit_short_name.toLowerCase().includes(lowerCircuit) ||
          m.meeting_name.toLowerCase().includes(lowerCircuit) ||
          m.location.toLowerCase().includes(lowerCircuit),
      );
    }

    if (next) {
      const now = Date.now();
      const upcoming = filtered
        .filter((m) => new Date(m.date_start).getTime() > now)
        .sort((a, b) => a.date_start.localeCompare(b.date_start));
      filtered = upcoming.slice(0, 1);
    }

    const weekends: WeekendSchedule[] = [];

    for (const meeting of filtered) {
      const sessions = await f1Fetch<OpenF1Session[]>(
        `/sessions?meeting_key=${meeting.meeting_key}`,
        { cacheKey: `sessions:meeting:${meeting.meeting_key}`, ttlSeconds: 3600 },
      );

      const sortedSessions = sessions
        .filter((s) => !s.is_cancelled)
        .sort((a, b) => a.date_start.localeCompare(b.date_start));

      weekends.push({
        meetingKey: meeting.meeting_key,
        meetingName: meeting.meeting_name,
        officialName: meeting.meeting_official_name,
        circuit: meeting.circuit_short_name,
        circuitImage: meeting.circuit_image,
        country: meeting.country_name,
        countryCode: meeting.country_code,
        countryFlag: meeting.country_flag,
        location: meeting.location,
        circuitType: meeting.circuit_type,
        weekendStart: meeting.date_start,
        weekendEnd: meeting.date_end,
        sessions: sortedSessions.map<WeekendSession>((s) => ({
          sessionKey: s.session_key,
          sessionName: s.session_name,
          sessionType: s.session_type,
          startDate: s.date_start,
          endDate: s.date_end,
          circuit: s.circuit_short_name,
          country: s.country_name,
          countryCode: s.country_code,
          location: s.location,
        })),
      });
    }

    if (weekends.length === 0) {
      return {
        weekends: [],
        message: circuit
          ? `No race weekend found for "${circuit}". Try a different circuit name.`
          : "No upcoming race weekends found.",
      };
    }

    return { weekends };
  },
});
