/**
 * Shared model roster for the runtime model picker.
 *
 * Pure data only — no eve/server or React imports — so it can be imported by
 * both the client UI (`app/_components/model-picker.tsx`) and the server-side
 * router (`agent/model-router.ts`).
 */

export type Effort = "default" | "low" | "medium" | "high";

export const EFFORTS: readonly Effort[] = ["default", "low", "medium", "high"];

export interface ModelOption {
  /** Vercel AI Gateway model id (`provider/model`). */
  readonly id: string;
  /** Human-readable label shown in the picker. */
  readonly label: string;
  /** Short provider name for the picker subtitle. */
  readonly provider: string;
  /** Whether the model supports a reasoning-effort control. */
  readonly reasoning: boolean;
}

/**
 * The models offered in the picker. All currently support reasoning effort,
 * so the effort control shows for every option — but `reasoning` is tracked
 * per-model so a non-reasoning model can be added later without UI changes.
 */
export const MODELS: readonly ModelOption[] = [
  { id: "zai/glm-5.2-fast", label: "GLM 5.2 Fast", provider: "Z.ai", reasoning: true },
  { id: "anthropic/claude-sonnet-5", label: "Sonnet 5", provider: "Anthropic", reasoning: true },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", provider: "Google", reasoning: true },
  { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash", provider: "DeepSeek", reasoning: true },
  { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "DeepSeek", reasoning: true },
];

export const DEFAULT_MODEL_ID = "zai/glm-5.2-fast";

export const DEFAULT_EFFORT: Effort = "default";

/**
 * Sentinel key carried in `send({ clientContext })`. The router reads the
 * `{ id, effort }` payload from the prompt, then strips the marker so the
 * downstream model never sees it.
 */
export const MODEL_CHOICE_KEY = "f1ModelChoice";

export interface ModelChoice {
  readonly id: string;
  readonly effort: Effort;
}

/** Resolve a model id to its option, falling back to the default. */
export function resolveModelOption(id: string | undefined): ModelOption {
  return MODELS.find((m) => m.id === id) ?? MODELS.find((m) => m.id === DEFAULT_MODEL_ID)!;
}

/** Whether a value is one of the supported effort levels. */
export function isEffort(value: unknown): value is Effort {
  return typeof value === "string" && (EFFORTS as readonly string[]).includes(value);
}
