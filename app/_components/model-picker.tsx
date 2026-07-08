"use client";

import { ChevronDownIcon, GaugeIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  type Effort,
  EFFORTS,
  MODELS,
  resolveModelOption,
} from "@/lib/models";

const EFFORT_LABELS: Record<Effort, string> = {
  default: "Default",
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function ModelPicker({
  modelId,
  effort,
  onModelChange,
  onEffortChange,
  disabled,
}: {
  readonly modelId: string;
  readonly effort: Effort;
  readonly onModelChange: (id: string) => void;
  readonly onEffortChange: (effort: Effort) => void;
  readonly disabled?: boolean;
}) {
  const selected = resolveModelOption(modelId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors outline-none",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <span className="font-medium">{selected.label}</span>
        {selected.reasoning && effort !== "default" ? (
          <span className="flex items-center gap-0.5 text-muted-foreground/70">
            <GaugeIcon className="size-3" />
            {EFFORT_LABELS[effort]}
          </span>
        ) : null}
        <ChevronDownIcon className="size-3 opacity-60" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-muted-foreground text-xs">Model</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={selected.id} onValueChange={onModelChange}>
          {MODELS.map((model) => (
            <DropdownMenuRadioItem key={model.id} value={model.id} className="text-sm">
              <span className="flex flex-col">
                <span>{model.label}</span>
                <span className="text-muted-foreground text-xs">{model.provider}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {selected.reasoning ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Reasoning effort
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={effort}
              onValueChange={(value) => onEffortChange(value as Effort)}
            >
              {EFFORTS.map((level) => (
                <DropdownMenuRadioItem key={level} value={level} className="text-sm">
                  {EFFORT_LABELS[level]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
