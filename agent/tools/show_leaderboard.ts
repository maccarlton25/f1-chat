import { defineTool } from "eve/tools";
import { z } from "zod";
import getSessionResults from "./get_session_results";

export default defineTool({
  description:
    "Show a visual leaderboard/results table to the user. Call this when the user explicitly asks to SEE results, a leaderboard, or race finishing order. Do NOT call this just to answer 'who won' — use get_session_results for that and answer in text.",
  inputSchema: z.object({
    sessionKey: z.number().int().describe("The session key to show results for."),
  }),
  async execute({ sessionKey }) {
    return getSessionResults.execute({ sessionKey }, {} as never);
  },
});
