/**
 * Instrumentation — configures how the agent is observed.
 *
 * eve auto-discovers this file at server startup and runs it before any
 * agent code.
 *
 * Two environments, two backends:
 *
 * - Local dev  → OpenObserve. The SDK is a locally-linked package
 *   (`file:../openobserve/...`) pointing at http://localhost:3001, so it is
 *   neither installed nor useful on Vercel. Loaded lazily + optionally.
 *
 * - Production (Vercel) → an OTLP-compatible backend, but only when
 *   OTEL_EXPORTER_OTLP_ENDPOINT is set. @vercel/otel's registerOTel reads the
 *   standard OTEL_EXPORTER_OTLP_* env vars, so you can point it at Honeycomb,
 *   Datadog, Braintrust (OTLP), Grafana, etc. purely via Vercel env vars —
 *   no code change. If the endpoint isn't set, this is a no-op and you still
 *   get eve's built-in Agent Runs view (powered by framework $eve.* tags)
 *   under the project's Observability tab.
 *
 * View the local dashboard at http://localhost:3001/p/eve-agent
 */

import { defineInstrumentation } from "eve/instrumentation";
import { registerOTel } from "@vercel/otel";

export default defineInstrumentation({
  setup: async ({ agentName }) => {
    // Production: export to a hosted OTLP backend if one is configured.
    if (process.env.VERCEL) {
      if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
        registerOTel({ serviceName: agentName });
      }
      // Otherwise: no-op. Agent Runs covers production observability.
      return;
    }

    // Local dev: OpenObserve (optional).
    const endpoint =
      process.env.OPEN_OBSERVE_OTLP_ENDPOINT ?? "http://localhost:3001";

    try {
      // Non-literal specifier: keeps the build from requiring the
      // locally-linked package to be resolvable at type-check time.
      const pkg = "@open-observe/sdk";
      const { observe } = (await import(pkg)) as {
        observe: (config: unknown) => Promise<void>;
      };

      await observe({
        serviceName: agentName,
        projectId: process.env.OPEN_OBSERVE_PROJECT_ID ?? "eve-agent",
        otlp: {
          traces: { endpoint },
          logs: { endpoint },
          metrics: { endpoint, exportIntervalMillis: 5000 },
        },
      });
    } catch (err) {
      // OpenObserve is optional. If the local package isn't linked, or the
      // local collector isn't running, just skip observability.
      console.warn(
        "[instrumentation] OpenObserve not available, skipping:",
        err instanceof Error ? err.message : err,
      );
    }
  },
});
