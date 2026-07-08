/**
 * Tool: web_search (overrides eve's built-in provider-managed web_search)
 *
 * Why override: the built-in web_search is provider-executed and resolves from
 * the model provider. This app's chat model is a custom multi-provider router
 * (see agent/model-router.ts), which that mechanism can't resolve through — so
 * the built-in web_search is unusable here. This override is an app-runtime
 * tool with its own executor, so it works through the router for every model.
 *
 * How it works: it runs its own one-shot search using Anthropic's web search
 * via the AI Gateway (the AI_GATEWAY_API_KEY the app already has — no new key),
 * independent of whichever model the user picked for the chat. It returns a
 * concise summary plus deduped source links for the UI and for multi-step use.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, gateway } from "ai";
import { defineTool } from "eve/tools";
import { z } from "zod";

/** Model used for the search itself (independent of the chat model). */
const SEARCH_MODEL = "anthropic/claude-sonnet-5";
const MAX_RESULTS = 3;

interface WebSearchResult {
  readonly title: string;
  readonly url: string;
  readonly pageAge: string | null;
}

export default defineTool({
  description:
    "Search the web for real-time information. Use this as a fallback when no F1 tool covers the question (recent driver news, contracts/transfers, regulations, off-track events) or when an F1 API tool returns no data or errors. Also use it to fetch current context before analysis. Returns a concise summary plus source links; use the results to continue your answer or feed context into other tools (e.g. run_analysis via dataJson).",

  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query, e.g. 'latest Max Verstappen contract news' or '2026 F1 regulation changes'"),
  }),

  async execute({ query }) {
    try {
      const result = await generateText({
        model: gateway(SEARCH_MODEL),
        tools: { web_search: anthropic.tools.webSearch_20250305({ maxUses: 4 }) },
        toolChoice: "auto",
        prompt:
          `Search the web and write a concise, factual, up-to-date summary answering: "${query}". ` +
          `Prioritize the most recent information and state dates where relevant.`,
      });

      const seen = new Set<string>();
      const results: WebSearchResult[] = [];
      for (const source of result.sources ?? []) {
        if (source.sourceType !== "url" || !source.url || seen.has(source.url)) continue;
        seen.add(source.url);
        const pageAge = (source.providerMetadata?.anthropic?.pageAge as string | null | undefined) ?? null;
        let title = source.title;
        if (!title) {
          try {
            title = new URL(source.url).hostname.replace(/^www\./, "");
          } catch {
            title = source.url;
          }
        }
        results.push({ title, url: source.url, pageAge });
        if (results.length >= MAX_RESULTS) break;
      }

      return { query, answer: result.text, results, error: false as const };
    } catch (error) {
      return {
        query,
        answer: "",
        results: [] as WebSearchResult[],
        error: true as const,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  toModelOutput(output) {
    if (output.error) {
      return {
        type: "text",
        value: `Web search failed: ${output.message ?? "unknown error"}. Rephrase the query or answer from what you know.`,
      };
    }
    if (output.results.length === 0 && !output.answer) {
      return { type: "text", value: `No web results found for "${output.query}".` };
    }
    const sources = output.results
      .map((r, i) => `[${i + 1}] ${r.title} — ${r.url}${r.pageAge ? ` (${r.pageAge})` : ""}`)
      .join("\n");
    return {
      type: "text",
      value: `Web search for "${output.query}":\n\n${output.answer}\n\nSources:\n${sources}`,
    };
  },
});
