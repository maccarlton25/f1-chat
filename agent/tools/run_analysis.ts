import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Run a Python analysis script in the sandbox. The sandbox has matplotlib, pandas, and numpy pre-installed. Network is DENIED — all data must be passed via the dataJson parameter. Write charts to /workspace/output/ and print text results to stdout. The sandbox persists across calls within the same session, so you can iterate: if a script fails or produces wrong output, fix the script and call run_analysis again without re-initializing. Always pass dataJson as a JSON object mapping filenames to data arrays/objects — these are written to /workspace/data/ as JSON files before the script runs.",

  inputSchema: z.object({
    script: z
      .string()
      .describe(
        "Python script to execute. Read input from /workspace/data/*.json, write charts to /workspace/output/*.png, print results to stdout.",
      ),
    dataJson: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Data to load into the sandbox. Keys become filenames (e.g. {\"lap_times.json\": [...]}), written to /workspace/data/. Pass data from prior tool calls here.",
      ),
  }),

  async execute({ script, dataJson }, ctx) {
    const sandbox = await ctx.getSandbox();

    await sandbox.writeTextFile({
      path: "analysis/script.py",
      content: script,
    });

    if (dataJson) {
      for (const [filename, data] of Object.entries(dataJson)) {
        await sandbox.writeTextFile({
          path: `data/${filename}`,
          content: JSON.stringify(data),
        });
      }
    }

    await sandbox.run({ command: "rm -f /workspace/output/*.png /workspace/output/*.json" });

    const result = await sandbox.run({
      command: "cd /workspace && python3 analysis/script.py 2>&1",
    });

    const listResult = await sandbox.run({
      command: "ls -1 /workspace/output/ 2>/dev/null || echo ''",
    });

    const outputFiles = listResult.stdout
      .trim()
      .split("\n")
      .filter((f) => f.length > 0)
      .map((f) => `/workspace/output/${f}`);

    return {
      exitCode: result.exitCode,
      stdout: result.stdout.slice(0, 5000),
      stderr: result.stderr.slice(0, 2000),
      outputFiles,
      success: result.exitCode === 0,
    };
  },

  toModelOutput(output) {
    if (output.success) {
      const files = output.outputFiles.length > 0
        ? " Charts saved: " + output.outputFiles.join(", ") + ". Call show_chart to display them."
        : " No charts were saved.";
      return {
        type: "text",
        value: `Analysis SUCCESS.${files}\n\nOutput:\n${output.stdout.slice(0, 3000)}`,
      };
    }
    return {
      type: "text",
      value: `Analysis FAILED (exit code ${output.exitCode}). Fix the script and call run_analysis again — the sandbox persists.\n\nStdout:\n${output.stdout.slice(0, 1000)}\n\nStderr:\n${output.stderr.slice(0, 1500)}`,
    };
  },
});
