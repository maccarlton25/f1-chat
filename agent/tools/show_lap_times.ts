import { defineTool } from "eve/tools";
import { z } from "zod";
import getLapTimes from "./get_lap_times";

export default defineTool({
  description:
    "Show a visual lap time chart for a specific driver to the user. Call this when the user explicitly asks to SEE lap times, a lap chart, or lap-by-lap data. Do NOT call this just to answer 'what was Verstappens fastest lap' — use get_lap_times or get_fastest_laps for that and answer in text.",
  inputSchema: z.object({
    driverNumber: z.number().int().describe("The drivers car number."),
    sessionKey: z.number().int().optional().describe("Session key. If omitted, uses the most recent completed race."),
  }),
  async execute({ driverNumber, sessionKey }) {
    return getLapTimes.execute({ driverNumber, sessionKey }, {} as never);
  },
});
