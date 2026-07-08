"use client";

import { useEveAgent } from "eve/react";
import { AlertCircleIcon, EyeIcon, EyeOffIcon, PlusIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL_ID,
  type Effort,
  isEffort,
  MODEL_CHOICE_KEY,
  resolveModelOption,
} from "@/lib/models";
import { AgentMessage } from "./agent-message";
import { ModelPicker } from "./model-picker";
import { F1ZeroState } from "./f1/zero-state";

const AGENT_NAME = "F1 Pit Wall";

export interface ZeroStateData {
  readonly nextSession: {
    readonly found: boolean;
    readonly sessionName?: string;
    readonly circuit?: string;
    readonly country?: string;
    readonly countryCode?: string;
    readonly location?: string;
    readonly startDate?: string;
    readonly countdown?: string;
    readonly sessionKey?: number;
  } | null;
  readonly lastRaceResult: {
    readonly raceName: string;
    readonly country: string;
    readonly podium: readonly {
      readonly position: number;
      readonly driverName: string;
      readonly team: string;
      readonly teamColour: string;
    }[];
  } | null;
  readonly remainingRaces: readonly {
    readonly round: number;
    readonly raceName: string;
    readonly country: string;
    readonly countryCode: string;
    readonly startDate: string;
    readonly circuit: string;
  }[];
  readonly totalRaces: number;
  readonly completedRaces: number;
}

type AgentStatus = ReturnType<typeof useEveAgent>["status"];

export function AgentChat({ zeroStateData }: { readonly zeroStateData?: ZeroStateData | null }) {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [effort, setEffort] = useState<Effort>(DEFAULT_EFFORT);

  // Keep the latest choice in a ref so the stable prepareSend callback below
  // always reads the current selection, even if captured once by the store.
  const choiceRef = useRef({ modelId, effort });
  choiceRef.current = { modelId, effort };

  const agent = useEveAgent({
    // Attach the chosen model + effort to every turn. The router in
    // agent/model-router.ts reads this marker, then strips it from the prompt.
    prepareSend: (input) => ({
      ...input,
      clientContext: {
        ...(input.clientContext && typeof input.clientContext === "object" && !Array.isArray(input.clientContext)
          ? input.clientContext
          : {}),
        [MODEL_CHOICE_KEY]: { id: choiceRef.current.modelId, effort: choiceRef.current.effort },
      },
    }),
  });
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isEmpty = agent.data.messages.length === 0;

  const [showToolCalls, setShowToolCalls] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("f1-show-tool-calls");
    if (stored !== null) setShowToolCalls(stored === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("f1-show-tool-calls", String(showToolCalls));
  }, [showToolCalls]);

  // Restore model + effort selection from localStorage on mount.
  useEffect(() => {
    const storedModel = localStorage.getItem("f1-model-id");
    if (storedModel) setModelId(resolveModelOption(storedModel).id);
    const storedEffort = localStorage.getItem("f1-effort");
    if (isEffort(storedEffort)) setEffort(storedEffort);
  }, []);

  const handleModelChange = (id: string) => {
    const resolved = resolveModelOption(id).id;
    setModelId(resolved);
    localStorage.setItem("f1-model-id", resolved);
  };

  const handleEffortChange = (next: Effort) => {
    setEffort(next);
    localStorage.setItem("f1-effort", next);
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text || isBusy) return;
    await agent.send({ message: text });
  };

  const composer = (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea placeholder="Ask about strategy, standings, race pace…" />
      <PromptInputSubmit onStop={agent.stop} status={agent.status} />
    </PromptInput>
  );

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {isEmpty ? null : (
        <header className="flex h-14 shrink-0 items-center justify-between pl-4 pr-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-muted-foreground text-sm">{AGENT_NAME}</span>
            <StatusDot status={agent.status} />
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowToolCalls((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
                showToolCalls
                  ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "text-foreground bg-muted",
              )}
              title={showToolCalls ? "Hide tool calls — user mode" : "Show tool calls — dev mode"}
            >
              {showToolCalls ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
              {showToolCalls ? "Dev" : "User"}
            </button>
            <button
              onClick={() => agent.reset()}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PlusIcon className="size-3.5" />
              New chat
            </button>
          </div>
        </header>
      )}

      {agent.error ? (
        <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 sm:px-6">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">Request failed</p>
              <p className="mt-0.5 text-muted-foreground">{agent.error.message}</p>
            </div>
          </div>
        </div>
      ) : null}

      {isEmpty ? null : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 sm:px-6">
            {agent.data.messages.map((message, index) => (
              <AgentMessage
                canRespond={!isBusy}
                isStreaming={
                  agent.status === "streaming" && index === agent.data.messages.length - 1
                }
                key={message.id}
                message={message}
                onInputResponses={(inputResponses) => agent.send({ inputResponses })}
                showToolCalls={showToolCalls}
              />
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      {isEmpty ? (
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
          <div className="mx-auto w-full max-w-2xl px-4 py-4">
            <F1ZeroState
              data={zeroStateData ?? null}
              onQuestionClick={(q) => agent.send({ message: q })}
              isBusy={isBusy}
            />
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-2xl shrink-0 px-4 pb-5 sm:px-6 pt-2 bg-background">
        <div className="w-full">{composer}</div>
        <div className="mt-1.5 flex items-center px-1">
          <ModelPicker
            modelId={modelId}
            effort={effort}
            onModelChange={handleModelChange}
            onEffortChange={handleEffortChange}
          />
        </div>
      </div>
    </main>
  );
}

function StatusDot({ status }: { readonly status: AgentStatus }) {
  const isLive = status === "submitted" || status === "streaming";
  const tone =
    status === "error"
      ? "bg-destructive"
      : isLive
        ? "bg-emerald-500"
        : status === "ready"
          ? "bg-muted-foreground"
          : "bg-muted-foreground/50";

  return (
    <span className="relative flex size-1">
      {isLive ? (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-75",
            tone,
          )}
        />
      ) : null}
      <span className={cn("relative inline-flex size-1 rounded-full transition-colors", tone)} />
    </span>
  );
}
