/**
 * Tool: get_circuit_info
 *
 * Returns circuit details for a specific meeting — track layout image,
 * circuit type (permanent/temporary/street), location, country flag,
 * and a link to detailed circuit info.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { f1Fetch } from "@/lib/f1/fetch";
import type { OpenF1Meeting } from "@/lib/f1/types";

export default defineTool({
  description:
    "Get circuit info for an F1 round — track layout image, circuit type, location, and country. Pass a meetingKey (from get_weekend_schedule); omit for the most recent or next meeting.",

  inputSchema: z.object({
    meetingKey: z
      .number()
      .int()
      .optional()
      .describe("The meeting key. If omitted, uses the most recent or next meeting."),
  }),

  async execute({ meetingKey }) {
    const year = new Date().getFullYear();

    let meeting: OpenF1Meeting | undefined;

    if (meetingKey !== undefined) {
      const meetings = await f1Fetch<OpenF1Meeting[]>(
        `/meetings?meeting_key=${meetingKey}`,
        { cacheKey: `meeting:${meetingKey}`, ttlSeconds: 3600 },
      );
      meeting = meetings[0];
    } else {
      const meetings = await f1Fetch<OpenF1Meeting[]>(
        `/meetings?year=${year}`,
        { cacheKey: `meetings:${year}`, ttlSeconds: 3600 },
      );

      const now = new Date();
      const sorted = meetings
        .filter((m) => !m.is_cancelled)
        .sort((a, b) => Math.abs(new Date(a.date_start).getTime() - now.getTime()) - Math.abs(new Date(b.date_start).getTime() - now.getTime()));

      meeting = sorted[0];
    }

    if (!meeting) {
      return { found: false as const, message: "No meeting found." };
    }

    return {
      found: true as const,
      meetingKey: meeting.meeting_key,
      meetingName: meeting.meeting_name,
      officialName: meeting.meeting_official_name,
      circuit: meeting.circuit_short_name,
      circuitType: meeting.circuit_type,
      circuitImage: meeting.circuit_image,
      circuitInfoUrl: meeting.circuit_info_url,
      country: meeting.country_name,
      countryCode: meeting.country_code,
      countryFlag: meeting.country_flag,
      location: meeting.location,
      gmtOffset: meeting.gmt_offset,
    };
  },
});
