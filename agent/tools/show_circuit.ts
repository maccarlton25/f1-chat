import { defineTool } from "eve/tools";
import { z } from "zod";
import getCircuitInfo from "./get_circuit_info";

export default defineTool({
  description:
    "Show a circuit map with track layout image and circuit details to the user. Call this when the user explicitly asks to SEE the track, circuit layout, or circuit info. Do NOT call this just to answer 'what type of circuit is Silverstone' — use get_circuit_info for that and answer in text.",
  inputSchema: z.object({
    meetingKey: z.number().int().optional().describe("The meeting key for the circuit."),
  }),
  async execute({ meetingKey }) {
    return getCircuitInfo.execute({ meetingKey }, {} as never);
  },
});
