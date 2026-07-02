import { cn } from "@/lib/utils";

interface WeekendSession {
  sessionKey: number;
  sessionName: string; // "Practice 1", "Qualifying", "Race", etc.
  sessionType: string;
  startDate: string; // ISO
  endDate: string; // ISO
  circuit: string;
  country: string;
  countryCode: string;
  location: string;
}

interface WeekendSchedule {
  meetingKey: number;
  meetingName: string;
  circuit: string;
  circuitImage: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  location: string;
  sessions: WeekendSession[];
}

interface Props {
  weekends: WeekendSchedule[];
}

/**
 * Renders a horizontal timeline for F1 weekend sessions.
 * Highlights the Race session and displays upcoming rounds if multiple weekends are provided.
 */
export function WeekendTimeline({ weekends }: Props) {
  if (!weekends || weekends.length === 0) return null;

  const primaryWeekend = weekends[0];
  const upcomingWeekends = weekends.slice(1);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-4 p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3">
          {primaryWeekend.countryFlag ? (
            <img 
              src={primaryWeekend.countryFlag} 
              alt={primaryWeekend.country} 
              className="w-6 h-4 object-cover rounded-sm border border-border"
            />
          ) : (
            <div className="w-6 h-4 bg-muted rounded-sm border border-border flex items-center justify-center text-[8px] text-muted-foreground">
              {primaryWeekend.countryCode || "F1"}
            </div>
          )}
          <h3 className="text-sm font-medium tracking-tight text-foreground">
            {primaryWeekend.meetingName}
          </h3>
          <span className="text-xs text-muted-foreground ml-auto">
            {primaryWeekend.location}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 mt-2">
          {primaryWeekend.sessions.map((session, index) => {
            const isRace = session.sessionName.toLowerCase().includes("race");
            const date = new Date(session.startDate);
            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dayString = date.toLocaleDateString([], { weekday: 'short' });

            return (
              <div 
                key={session.sessionKey} 
                className={cn(
                  "flex flex-row sm:flex-col flex-1 border-l sm:border-l-0 sm:border-t border-border pl-4 sm:pl-0 sm:pt-4 pb-2 sm:pb-0 relative",
                  index !== 0 && "sm:ml-2",
                  isRace ? "border-foreground" : "border-border"
                )}
              >
                {/* Timeline node marker */}
                <div className={cn(
                  "absolute -left-[5px] sm:left-0 sm:-top-[5px] w-2 h-2 rounded-full",
                  isRace ? "bg-foreground w-2.5 h-2.5 -left-[6px] sm:-top-[6px]" : "bg-muted-foreground/30"
                )} />
                
                <div className="flex flex-col gap-0.5">
                  <span className={cn(
                    "text-xs font-medium tracking-tight",
                    isRace ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {session.sessionName}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {dayString} {timeString}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {upcomingWeekends.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upcoming Rounds</h4>
          <div className="flex flex-col gap-2">
            {upcomingWeekends.map((weekend) => {
              const startDate = weekend.sessions[0]?.startDate ? new Date(weekend.sessions[0].startDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
              const endDate = weekend.sessions[weekend.sessions.length - 1]?.startDate ? new Date(weekend.sessions[weekend.sessions.length - 1].startDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
              
              return (
                <div key={weekend.meetingKey} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 text-sm">
                  <div className="flex items-center gap-3">
                    {weekend.countryFlag ? (
                      <img 
                        src={weekend.countryFlag} 
                        alt={weekend.country} 
                        className="w-5 h-3.5 object-cover rounded-sm border border-border opacity-80"
                      />
                    ) : (
                      <div className="w-5 h-3.5 bg-muted rounded-sm border border-border flex items-center justify-center text-[8px] text-muted-foreground">
                        {weekend.countryCode || "F1"}
                      </div>
                    )}
                    <span className="font-medium text-foreground/90">{weekend.meetingName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {startDate} - {endDate}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
