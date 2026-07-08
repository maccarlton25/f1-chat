/**
 * Runtime model router.
 *
 * eve compiles `defineAgent({ model })` at build time, so there is no native
 * per-turn model field. This custom `LanguageModel` is set as the agent model
 * and picks the real upstream model per turn instead:
 *
 * 1. The client attaches `{ id, effort }` to every turn via
 *    `send({ clientContext: { [MODEL_CHOICE_KEY]: choice } })`. eve renders that
 *    as a user-role context message in the model prompt.
 * 2. `resolveChoice` reads the marker, persists it in `defineState` (so every
 *    model call within a multi-step tool turn uses the same choice), and strips
 *    the marker from the prompt so the downstream model never sees it.
 * 3. The router delegates `doGenerate`/`doStream` to `gateway(choice.id)`,
 *    injecting provider-native reasoning-effort options.
 *
 * The model call runs inside eve's AsyncLocalStorage step scope, which is what
 * makes `defineState` usable here. All state access is defensive: if it ever
 * runs outside a managed scope, the router degrades to the prompt marker plus
 * the default model.
 */

import { gateway, type LanguageModel } from "ai";
import { defineState } from "eve/context";
import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL_ID,
  type Effort,
  isEffort,
  MODEL_CHOICE_KEY,
  type ModelChoice,
  resolveModelOption,
} from "../lib/models";

/** The concrete model type the gateway produces (spec-version aligned). */
type GatewayModel = ReturnType<typeof gateway>;
type CallOptions = Parameters<GatewayModel["doStream"]>[0];
type Prompt = CallOptions["prompt"];

const modelChoice = defineState<ModelChoice>("f1.model-choice", () => ({
  id: DEFAULT_MODEL_ID,
  effort: DEFAULT_EFFORT,
}));

/** Google thinking budgets (tokens) per effort level. */
const GOOGLE_BUDGET: Record<Exclude<Effort, "default">, number> = {
  low: 2048,
  medium: 8192,
  high: 24576,
};

/**
 * Provider-native reasoning-effort options, keyed by the model id's provider
 * prefix. Verified against the AI Gateway. `"default"` returns nothing so the
 * provider/model default applies.
 */
function reasoningProviderOptions(id: string, effort: Effort): CallOptions["providerOptions"] | undefined {
  if (effort === "default") return undefined;
  const provider = id.split("/")[0];
  switch (provider) {
    case "anthropic":
      return { anthropic: { thinking: { type: "adaptive" }, outputConfig: { effort } } };
    case "google":
      return { google: { thinkingConfig: { thinkingBudget: GOOGLE_BUDGET[effort], includeThoughts: true } } };
    case "deepseek":
      return { deepseek: { reasoningEffort: effort } };
    case "zai":
      return { zai: { reasoningEffort: effort } };
    default:
      return undefined;
  }
}

/** Try to extract a `{ id, effort }` choice from one text part. */
function parseChoice(text: string): ModelChoice | null {
  if (!text.includes(MODEL_CHOICE_KEY)) return null;
  // The marker rides inside a JSON-serialized clientContext message; pull the
  // first JSON object out of the text and read our key.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const raw = parsed[MODEL_CHOICE_KEY];
    if (!raw || typeof raw !== "object") return null;
    const { id, effort } = raw as Record<string, unknown>;
    if (typeof id !== "string") return null;
    return { id: resolveModelOption(id).id, effort: isEffort(effort) ? effort : DEFAULT_EFFORT };
  } catch {
    return null;
  }
}

/**
 * Find the model choice in the prompt (if the client sent one this turn) and
 * return the prompt with the marker message removed. Persists the choice so
 * follow-up model calls in the same session reuse it.
 */
function resolveChoice(prompt: Prompt): { choice: ModelChoice; prompt: Prompt } {
  let found: ModelChoice | null = null;
  const cleaned: Prompt = [];

  for (const message of prompt) {
    if (found === null && message.role === "user" && Array.isArray(message.content)) {
      const remaining = message.content.filter((part) => {
        if (part.type === "text") {
          const choice = parseChoice(part.text);
          if (choice) {
            found = choice;
            return false; // drop the marker part
          }
        }
        return true;
      });
      // Drop the message entirely if it held only the marker.
      if (remaining.length > 0) cleaned.push({ ...message, content: remaining });
      continue;
    }
    cleaned.push(message);
  }

  if (found) {
    try {
      modelChoice.update(() => found!);
    } catch {
      // outside a managed scope — fall through to the marker value
    }
    return { choice: found, prompt: cleaned };
  }

  let choice: ModelChoice = { id: DEFAULT_MODEL_ID, effort: DEFAULT_EFFORT };
  try {
    choice = modelChoice.get();
  } catch {
    // outside a managed scope — use the default
  }
  return { choice, prompt: cleaned };
}

/** Resolve the target model + delegated options for one call. */
function withChoice(options: CallOptions): { target: GatewayModel; options: CallOptions } {
  const { choice, prompt } = resolveChoice(options.prompt);
  const reasoning = reasoningProviderOptions(choice.id, choice.effort);
  return {
    target: gateway(choice.id),
    options: {
      ...options,
      prompt,
      providerOptions: reasoning ? { ...options.providerOptions, ...reasoning } : options.providerOptions,
    },
  };
}

/**
 * Create the router model. It spreads a real gateway model so it carries the
 * correct `specificationVersion`, `supportedUrls`, and any other required
 * fields, then overrides only the two call methods to delegate to the chosen
 * model per turn.
 */
export function createModelRouter(): LanguageModel {
  const reference = gateway(DEFAULT_MODEL_ID);
  return {
    ...reference,
    provider: "f1-router",
    modelId: "router",
    doGenerate: (options: CallOptions) => {
      const { target, options: delegated } = withChoice(options);
      return target.doGenerate(delegated);
    },
    doStream: (options: CallOptions) => {
      const { target, options: delegated } = withChoice(options);
      return target.doStream(delegated);
    },
  };
}
