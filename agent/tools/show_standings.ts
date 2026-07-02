import { defineTool } from "eve/tools";
import { z } from "zod";
import getStandings from "./get_championship_standings";

export default defineTool({
  description:
    "Show a visual championship standings table (drivers + constructors) to the user. Call this when the user explicitly asks to SEE standings, the championship table, or points. Do NOT call this just to answer 'who leads the championship' — use get_championship_standings for that and answer in text.",
  inputSchema: z.object({}),
  async execute() {
    return getStandings.execute({}, {} as never);
  },
});
