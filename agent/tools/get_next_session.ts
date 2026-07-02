/**
 * Tool: get_next_session
 *
 * Finds the next upcoming F1 session of ANY type — not just races.
 * This covers Practice, Qualifying, Sprint Qualifying, Sprint, and Race.
 * Returns the session details with a countdown from now.
 */

import { defineTool } from "eve/tools";
import { z } from "zod";
import { getNextSession } from "@/lib/f1/session";

export default defineTool({
  description:
    "Find the next upcoming F1 session (any type — practice, qualifying, sprint, or race). Returns session name, circuit, country, start time, and a countdown. No input needed.",

  inputSchema: z.object({}),

  async execute() {
    const next = await getNextSession();

    if (!next) {
      return {
        found: false as const,
        message: "No upcoming sessions found. The season may have ended.",
      };
    }

    const now = new Date();
    const msUntil = new Date(next.date_start).getTime() - now.getTime();
    const daysUntil = Math.floor(msUntil / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.floor((msUntil % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return {
      found: true as const,
      sessionKey: next.session_key,
      sessionName: next.session_name,
      circuit: next.circuit_short_name,
      country: next.country_name,
      countryCode: next.country_code,
      location: next.location,
      startDate: next.date_start,
      endDate: next.date_end,
      gmtOffset: next.gmt_offset,
      countdown: `${daysUntil} days, ${hoursUntil} hours from now`,
    };
  },
});
