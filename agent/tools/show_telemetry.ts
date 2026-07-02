import { defineTool } from "eve/tools";
import { z } from "zod";
import getTelemetry from "./get_driver_telemetry";

export default defineTool({
  description:
    "Show a visual telemetry chart (speed, throttle, brake, gear) for a specific driver to the user. Call this when the user explicitly asks to SEE telemetry, speed data, or a telemetry chart. Do NOT call this just to answer 'what was the top speed' — use get_driver_telemetry for that and answer in text.",
  inputSchema: z.object({
    driverNumber: z.number().int().describe("The drivers car number."),
    sessionKey: z.number().int().optional().describe("Session key. If omitted, uses the most recent completed race."),
  }),
  async execute({ driverNumber, sessionKey }) {
    return getTelemetry.execute({ driverNumber, sessionKey }, {} as never);
  },
});
