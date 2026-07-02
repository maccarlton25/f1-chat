import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Show a chart image from the sandbox in the chat. After run_analysis saves a PNG to /workspace/output/, call this with the filename to display it. The image is read from the sandbox and rendered inline.",

  inputSchema: z.object({
    filename: z
      .string()
      .describe("Filename of the chart in /workspace/output/ (e.g. 'lap_comparison.png')"),
  }),

  async execute({ filename }, ctx) {
    const sandbox = await ctx.getSandbox();

    const imageBytes = await sandbox.readBinaryFile({
      path: `output/${filename}`,
    });

    if (!imageBytes) {
      return {
        filename,
        imageBase64: null,
        mediaType: "image/png",
        message: `Chart file "${filename}" not found in /workspace/output/`,
      };
    }

    const base64 = Buffer.from(imageBytes).toString("base64");

    return {
      filename,
      imageBase64: base64,
      mediaType: "image/png",
    };
  },

  toModelOutput(output) {
    return {
      type: "text",
      value: `Chart "${output.filename}" displayed to the user.`,
    };
  },
});
