import { cn } from "@/lib/utils";

export interface ZeroStateData {
  nextSession: {
    found: boolean;
    sessionName?: string;
    circuit?: string;
    country?: string;
    countryCode?: string;
    location?: string;
    startDate?: string;
    countdown?: string;
    sessionKey?: number;
  } | null;
  lastRaceResult: {
    raceName: string;
    country: string;
    podium: readonly { position: number; driverName: string; team: string; teamColour: string }[];
  } | null;
  remainingRaces: readonly {
    round: number;
    raceName: string;
    country: string;
    countryCode: string;
    startDate: string;
    circuit: string;
  }[];
  totalRaces: number;
  completedRaces: number;
}

interface Props {
  data: ZeroStateData | null;
  onQuestionClick: (question: string) => void;
  isBusy: boolean;
}

function formatDriverName(fullName: string) {
  const parts = fullName.split(" ");
  if (parts.length === 1) return <span className="font-semibold">{parts[0]}</span>;
  const lastName = parts.pop();
  const firstName = parts.join(" ");
  return (
    <>
      <span className="text-muted-foreground">{firstName}</span>{" "}
      <span className="font-semibold">{lastName}</span>
    </>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const tileClass =
  "cursor-pointer text-left transition-all duration-200 hover:border-foreground/20 hover:bg-card/80 disabled:opacity-50 disabled:cursor-not-allowed";

export function F1ZeroState({ data, onQuestionClick, isBusy }: Props) {
  const isLive = data?.nextSession?.startDate
    ? new Date(data.nextSession.startDate) < new Date()
    : false;

  const hasRaceData = data && data.totalRaces > 0;

  const exploreQuestions = [
    "What are the championship standings?",
    "Show me lap times for Verstappen",
    "Compare Verstappen and Norris lap times head-to-head",
    "What was the pace trend in the last race?",
  ];

  return (
    <div className="flex flex-col w-full gap-4">
      <div className="flex flex-col items-center text-center gap-1">
        <div className="h-px w-10 bg-red-500 mb-1.5" />
        <h1 className="text-3xl sm:text-4xl tracking-tighter font-medium text-foreground">
          F1 Pit Wall
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Ask anything about Formula One
        </p>
      </div>

      {data ? (
        <div className="flex flex-col gap-3.5">
          {data.nextSession?.found && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-red-500">
                Up Next
              </span>
              <button
                onClick={() =>
                  onQuestionClick(
                    isLive
                      ? "What's happening in the race right now?"
                      : `What's the weekend schedule for ${data.nextSession?.circuit ?? "the next race"}?`,
                  )
                }
                disabled={isBusy}
                className={cn(
                  "bg-card border border-border rounded-xl p-3.5 flex items-center justify-between gap-3 w-full",
                  tileClass,
                )}
              >
                <div className="min-w-0 flex flex-col gap-0.5">
                  <span className="text-sm font-semibold tracking-tight truncate">
                    {data.nextSession.sessionName}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {data.nextSession.circuit}
                    {data.nextSession.countryCode ? ` · ${data.nextSession.countryCode}` : ""}
                  </span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span
                    className={cn(
                      "text-lg font-bold tracking-tighter",
                      isLive ? "text-red-500 animate-pulse" : "text-red-500",
                    )}
                  >
                    {isLive
                      ? "LIVE"
                      : data.nextSession.countdown?.replace(" from now", "")}
                  </span>
                </div>
              </button>
            </div>
          )}

          {hasRaceData && (
            <button
              onClick={() => onQuestionClick("What are the championship standings?")}
              disabled={isBusy}
              className={cn("flex items-center gap-2.5 w-full", tileClass)}
            >
              <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                Season {data.completedRaces}/{data.totalRaces}
              </span>
              <div className="h-0.5 flex-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{
                    width: `${data.totalRaces > 0 ? (data.completedRaces / data.totalRaces) * 100 : 0}%`,
                  }}
                />
              </div>
            </button>
          )}

          {data.lastRaceResult && data.lastRaceResult.podium.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Last Race · {data.lastRaceResult.raceName}
              </span>
              <div className="grid grid-cols-3 gap-2">
                {data.lastRaceResult.podium.map((driver) => (
                  <button
                    key={driver.position}
                    onClick={() =>
                      onQuestionClick(
                        `Show me ${driver.driverName}'s lap times from the last race`,
                      )
                    }
                    disabled={isBusy}
                    className={cn(
                      "bg-card border border-border rounded-lg p-2.5 flex items-center gap-2 relative overflow-hidden w-full",
                      tileClass,
                    )}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: `#${driver.teamColour}` }}
                    />
                    <div
                      className={cn(
                        "flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold shrink-0 ml-0.5",
                        driver.position === 1
                          ? "bg-amber-500/15 text-amber-500"
                          : driver.position === 2
                            ? "bg-slate-400/15 text-slate-300"
                            : "bg-orange-700/15 text-orange-600",
                      )}
                    >
                      {driver.position}
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <span className="text-[11px] leading-tight whitespace-nowrap overflow-hidden">
                        {formatDriverName(driver.driverName)}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                        {driver.team}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {data.remainingRaces.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Upcoming
              </span>
              <div className="grid grid-cols-3 gap-2">
                {data.remainingRaces.slice(0, 3).map((race) => (
                  <button
                    key={race.round}
                    onClick={() =>
                      onQuestionClick(
                        `What's the weekend schedule for ${race.circuit}?`,
                      )
                    }
                    disabled={isBusy}
                    className={cn(
                      "bg-card border border-border rounded-lg p-2.5 flex flex-col gap-0.5 w-full",
                      tileClass,
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        R{race.round}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-secondary px-1 py-0.5 rounded">
                        {race.countryCode}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium leading-tight">
                      {race.raceName.replace(" Grand Prix", "")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(race.startDate)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5 justify-center pt-1">
        {exploreQuestions.map((q) => (
          <button
            key={q}
            onClick={() => onQuestionClick(q)}
            disabled={isBusy}
            className="text-xs text-muted-foreground bg-transparent hover:bg-secondary/40 hover:text-foreground px-3 py-1.5 rounded-full border border-border/40 hover:border-border transition-all duration-200 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="pt-1.5 pb-0.5 text-center border-t border-border/40">
        <a
          href="https://vercel.com/eve"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          made with eve
        </a>
      </div>
    </div>
  );
}
