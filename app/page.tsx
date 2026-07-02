import { AgentChat, type ZeroStateData } from "@/app/_components/agent-chat";
import { getNextSession, getMostRecentSession, getSeasonRaces } from "@/lib/f1/session";
import { f1Fetch } from "@/lib/f1/fetch";
import type { OpenF1Driver, OpenF1Position } from "@/lib/f1/types";

async function fetchZeroStateData(): Promise<ZeroStateData> {
  try {
    const [nextSession, lastRace, races] = await Promise.all([
      getNextSession(),
      getMostRecentSession("Race"),
      getSeasonRaces(),
    ]);

    const now = new Date();
    const completedRaces = races.filter((r) => new Date(r.date_start) < now).length;
    const remaining = races
      .filter((r) => new Date(r.date_start) > now && !r.is_cancelled)
      .slice(0, 3)
      .map((r, i) => {
        const completed = races.filter((rc) => new Date(rc.date_start) < now).length;
        return {
          round: completed + i + 1,
          raceName: `${r.circuit_short_name} Grand Prix`,
          country: r.country_name,
          countryCode: r.country_code,
          startDate: r.date_start,
          circuit: r.circuit_short_name,
        };
      });

    let lastRaceResult: ZeroStateData["lastRaceResult"] = null;

    if (lastRace) {
      const [positions, drivers] = await Promise.all([
        f1Fetch<OpenF1Position[]>(
          `/position?session_key=${lastRace.session_key}`,
          { cacheKey: `positions:${lastRace.session_key}`, ttlSeconds: 86400 },
        ),
        f1Fetch<OpenF1Driver[]>(
          `/drivers?session_key=${lastRace.session_key}`,
          { cacheKey: `drivers:${lastRace.session_key}`, ttlSeconds: 86400 },
        ),
      ]);

      const driverMap = new Map(drivers.map((d) => [d.driver_number, d]));
      const finalPositions = new Map<number, number>();
      for (const pos of positions.sort((a, b) => a.date.localeCompare(b.date))) {
        finalPositions.set(pos.driver_number, pos.position);
      }

      const podium = Array.from(finalPositions.entries())
        .filter(([, p]) => p <= 3)
        .sort((a, b) => a[1] - b[1])
        .map(([driverNumber, position]) => {
          const driver = driverMap.get(driverNumber);
          return {
            position,
            driverName: driver?.full_name ?? `Driver #${driverNumber}`,
            team: driver?.team_name ?? "Unknown",
            teamColour: driver?.team_colour ?? "000000",
          };
        });

      lastRaceResult = {
        raceName: `${lastRace.circuit_short_name} Grand Prix`,
        country: lastRace.country_name,
        podium,
      };
    }

    return {
      nextSession: nextSession
        ? {
            found: true,
            sessionName: nextSession.session_name,
            circuit: nextSession.circuit_short_name,
            country: nextSession.country_name,
            countryCode: nextSession.country_code,
            location: nextSession.location,
            startDate: nextSession.date_start,
            countdown: formatCountdown(nextSession.date_start),
            sessionKey: nextSession.session_key,
          }
        : { found: false },
      lastRaceResult,
      remainingRaces: remaining,
      totalRaces: races.length,
      completedRaces,
    };
  } catch {
    return {
      nextSession: null,
      lastRaceResult: null,
      remainingRaces: [],
      totalRaces: 0,
      completedRaces: 0,
    };
  }
}

function formatCountdown(startDate: string): string {
  const ms = new Date(startDate).getTime() - Date.now();
  if (ms <= 0) return "starting soon";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} days, ${hours} hours`;
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} hours, ${mins} minutes`;
}

export default async function Page() {
  const zeroStateData = await fetchZeroStateData();
  return <AgentChat zeroStateData={zeroStateData} />;
}
