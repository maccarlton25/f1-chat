/**
 * Instrumentation — wires OpenObserve as the observability backend.
 *
 * eve auto-discovers this file at server startup and runs it before any
 * agent code. The observe() call registers OpenTelemetry exporters that
 * send traces, logs, and metrics to the local OpenObserve dashboard.
 *
 * View the dashboard at http://localhost:3001/p/eve-agent
 */

import { defineInstrumentation } from "eve/instrumentation";
import { observe } from "@open-observe/sdk";

export default defineInstrumentation({
  setup: async ({ agentName }) => {
    const endpoint =
      process.env.OPEN_OBSERVE_OTLP_ENDPOINT ?? "http://localhost:3001";

    await observe({
      serviceName: agentName,
      projectId: process.env.OPEN_OBSERVE_PROJECT_ID ?? "eve-agent",
      otlp: {
        traces: { endpoint },
        logs: { endpoint },
        metrics: { endpoint, exportIntervalMillis: 5000 },
      },
    });
  },
});
