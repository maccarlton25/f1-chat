import { defineTool } from "eve/tools";
import { z } from "zod";
import getSchedule from "./get_weekend_schedule";

export default defineTool({
  description:
    "Show a visual weekend schedule timeline to the user. Call this when the user explicitly asks to SEE the schedule, timetable, or session times. Do NOT call this just to answer 'when is qualifying' — use get_weekend_schedule for that and answer in text. Always pass circuit or next to target a specific weekend.",
  inputSchema: z.object({
    circuit: z.string().optional().describe("Circuit name (e.g. Silverstone, Monaco)."),
    next: z.boolean().optional().describe("Set to true for the next upcoming race weekend."),
    meetingKey: z.number().int().optional().describe("The meeting key for a specific round."),
  }),
  async execute({ circuit, next, meetingKey }) {
    return getSchedule.execute({ circuit, next, meetingKey }, {} as never);
  },
});
