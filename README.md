# F1 Pit Wall

An interactive Formula One chat agent built with [eve](https://vercel.com/eve) and Next.js, styled with the Geist design system. Ask about race schedules, championship standings, driver lap times, telemetry, and head-to-head comparisons — the agent fetches live data from the [OpenF1 API](https://openf1.org), renders rich visualizations, and can run Python analysis in a sandbox for custom charts.

## Prerequisites

- **Node.js 24+** (check with `node --version`)
- **npm** (comes with Node)
- **An AI provider key** — see [API Key Setup](#api-key-setup) below
- **microsandbox** (auto-installed by `eve dev` for the analysis sandbox)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and add your API key
cp .env.example .env.local
# Then edit .env.local and paste your key

# 3. Start the dev server
npm run dev

# 4. Open http://localhost:3000
```

You should see a dark, minimal dashboard titled "F1 Pit Wall" with the next session countdown, last race podium, upcoming races, and suggested questions. Click a tile or type your own.

## API Key Setup

The agent needs an AI model to generate responses. The default model (`anthropic/claude-sonnet-4.6`) routes through the Vercel AI Gateway. Pick one:

| Option | How | Best for |
|--------|-----|----------|
| **AI Gateway** (recommended) | Set `AI_GATEWAY_API_KEY` in `.env.local` | Local dev and Vercel |
| **Vercel OIDC** | Run `vercel link` — eve pulls a token automatically | Vercel deployments only |
| **Direct provider** | Set `ANTHROPIC_API_KEY` and change `agent/agent.ts` to `anthropic("claude-sonnet-4.6")` | If you have a direct Anthropic key |

## Project Structure

```
f1-chat/
├── agent/                            ← The AI agent (filesystem-first: files = behavior)
│   ├── agent.ts                      ← Model config (which AI model to use)
│   ├── instructions.md               ← System prompt (identity, tool routing, API gotchas)
│   ├── instrumentation.ts            ← OpenObserve observability wiring
│   ├── tools/                        ← 22 typed tools (14 data + 6 render + 2 sandbox)
│   │   ├── get_championship_standings.ts
│   │   ├── get_weekend_schedule.ts
│   │   ├── get_next_session.ts
│   │   ├── get_circuit_info.ts
│   │   ├── get_driver_info.ts
│   │   ├── get_session_results.ts
│   │   ├── get_qualifying_breakdown.ts
│   │   ├── get_fastest_laps.ts
│   │   ├── get_live_leaderboard.ts
│   │   ├── get_pit_stops.ts
│   │   ├── get_weather.ts
│   │   ├── get_driver_telemetry.ts
│   │   ├── get_lap_times.ts
│   │   ├── get_position_history.ts
│   │   ├── show_standings.ts         ← Render tools (produce visualizations)
│   │   ├── show_leaderboard.ts
│   │   ├── show_circuit.ts
│   │   ├── show_lap_times.ts
│   │   ├── show_telemetry.ts
│   │   ├── show_schedule.ts
│   │   ├── run_analysis.ts           ← Sandbox tools (Python execution)
│   │   └── show_chart.ts
│   ├── sandbox/                      ← Python sandbox definition
│   │   ├── sandbox.ts                ← microsandbox VM, deny-all network, matplotlib/pandas/numpy
│   │   └── workspace/                ← Seeded files (README for the sandbox)
│   └── channels/
│       └── eve.ts                    ← HTTP API auth (public demo: no auth)
├── app/                              ← Next.js App Router
│   ├── layout.tsx                    ← Root layout (Geist fonts, dark-first theme)
│   ├── page.tsx                      ← Home page (server-side data fetch for zero state)
│   ├── globals.css                   ← Geist design tokens (dark-first)
│   └── _components/
│       ├── agent-chat.tsx            ← Chat UI (zero state, composer, User/Dev toggle)
│       ├── agent-message.tsx         ← Renders messages + routes tool outputs to visualizations
│       └── f1/                       ← Generative UI visualization components
│           ├── zero-state.tsx        ← Landing dashboard (countdown, podium, calendar, prompts)
│           ├── championship-standings.tsx
│           ├── live-leaderboard.tsx
│           ├── qualifying-board.tsx
│           ├── pit-stop-table.tsx
│           ├── weather-widget.tsx
│           ├── weekend-timeline.tsx
│           ├── circuit-map.tsx
│           ├── lap-time-chart.tsx
│           ├── position-history-chart.tsx
│           ├── telemetry-chart.tsx
│           ├── driver-card.tsx
│           └── tool-visualization.tsx  ← Router: tool name → visualization component
├── lib/
│   ├── utils.ts                      ← cn() helper for class merging
│   └── f1/                           ← Shared F1 utilities
│       ├── types.ts                  ← TypeScript interfaces for OpenF1 API responses
│       ├── cache.ts                  ← Session-lifecycle-aware TTL cache
│       ├── fetch.ts                  ← Fetch wrapper with retry, 404 handling, caching
│       ├── session.ts                ← Session resolution helpers (races + sprints)
│       ├── points.ts                 ← F1 championship points system (races + sprints)
│       └── api-reference.ts          ← Documented API gotchas for the model
├── components/                       ← Reusable UI primitives
│   ├── ai-elements/                  ← Chat components (Conversation, PromptInput, Message, Tool)
│   └── ui/                           ← shadcn/ui components (Button, Tooltip, etc.)
└── next.config.ts                    ← withEve() + transpilePackages for OpenObserve SDK
```

## How It Works

### Three types of tools: data, render, and sandbox

**Data tools** (`get_*`) fetch data and return a text summary to the model via `toModelOutput`. Use these for quick factual answers — "who won?", "when is qualifying?". No visualization is produced.

**Render tools** (`show_*`) produce visualizations in the chat. The model calls these when the user asks about data that has a rich visualization — standings, schedules, leaderboards, lap charts, telemetry, circuit maps.

**Sandbox tools** (`run_analysis` + `show_chart`) let the model run Python scripts for custom analysis and charts — head-to-head comparisons, pace trends, statistical analysis.

```
User: "Who won the last race?"
  → Model calls get_session_results (data tool)
  → Model answers in text: "Russell won from Verstappen by 2.2 seconds"
  → No visualization

User: "Show me the championship standings"
  → Model calls show_standings (render tool)
  → ChampionshipStandings table renders inline
  → Model adds commentary: "Antonelli leads by 40 points over Russell"

User: "Compare Verstappen and Norris lap times head-to-head"
  → Model calls get_lap_times for both drivers (data tools)
  → Model calls run_analysis with Python script + data (sandbox)
  → Python creates matplotlib chart in sandbox
  → Model calls show_chart to display chart inline
  → Model adds commentary about what the chart shows
```

### Session-Aware Caching

F1 data has three lifecycle states with opposite freshness needs:

| State | Cache TTL | Why |
|-------|-----------|-----|
| Upcoming (race hasn't started) | 1 hour | Schedule is stable |
| **LIVE** (race in progress) | 15-30 seconds | Positions updating in real-time |
| Completed (race is over) | 24 hours | Data is immutable forever |

The cache (`lib/f1/cache.ts`) computes TTL from the session's start/end times. During a live race, leaderboard data refreshes every 15 seconds. After the race, the same data is cached for 24 hours.

### Sandbox

A Python runtime (microsandbox VM) with matplotlib, pandas, and numpy pre-installed. Network access is **DENIED** — all data is passed in via the `dataJson` parameter. The sandbox persists across calls within the same session, so the model can iterate: if a script fails, it fixes the script and retries without re-initializing.

### Observability

[OpenObserve](https://github.com/maccarlton25/openobserve) is wired via `agent/instrumentation.ts`. Traces, logs, and metrics are exported via OpenTelemetry to a local DuckDB-backed dashboard.

```bash
# Terminal 1: Start the dashboard
cd /path/to/openobserve
pnpm --filter @open-observe/dashboard dev

# Terminal 2: Start the agent
cd /Users/maccarlton/Projects/f1-chat
npm run dev
```

View sessions, traces, and tool calls at http://localhost:3001/p/eve-agent

## API Gotchas

The OpenF1 API has several quirks documented in `lib/f1/api-reference.ts` and `agent/instructions.md`:

1. **Sprint races award championship points** (8-7-6-5-4-3-2-1 for P1-P8, 6 sprints in 2026)
2. **2026 driver numbers differ from historical seasons** (#3 = Verstappen, #1 = Norris, #81 = Piastri)
3. **The /drivers endpoint returns duplicate records** — tools deduplicate by driver_number
4. **Pre-Season Testing appears in meetings** — tools filter it out
5. **Telemetry spans 20+ hours** — tools filter to the race window and exclude garage data
6. **Race gaps use start/finish line timestamps**, not cumulative lap durations
7. **404 responses return `{"detail":"No results found."}`** — tools handle gracefully and return actionable error messages so the model can self-correct

## Features

- **Zero state dashboard**: Next race countdown, last race podium, upcoming calendar — all tiles are clickable prompts
- **User/Dev mode toggle**: Hide tool calls and reasoning for a clean user experience, or show everything for debugging
- **11 visualization components**: Standings, leaderboard, qualifying board, pit stops, weather, weekend timeline, circuit map, lap time chart, position history chart, telemetry chart, driver cards
- **Scroll/pagination**: Leaderboard and standings show top 8 with "Show more" button
- **Error recovery**: Tools return actionable error messages; the model can look up correct driver numbers and retry
- **Sandbox analysis**: Python runtime for custom computations and matplotlib charts

## Deploying to Vercel

```bash
# 1. Link to a Vercel project
vercel link

# 2. Set your AI Gateway key as an env var
vercel env add AI_GATEWAY_API_KEY
# (paste your key when prompted, select Production + Preview + Development)

# 3. Deploy
vercel --prod
```

The eve runtime and Next.js app deploy as a single Vercel project. The web app stays public; the eve runtime sits behind it on the same origin. The sandbox runs on Vercel Sandbox infrastructure automatically.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent framework | [eve](https://vercel.com/eve) v0.17 |
| Web framework | [Next.js](https://nextjs.org) 16 (App Router) |
| UI library | React 19 |
| Styling | Tailwind CSS 4 + Geist design tokens |
| Components | [shadcn/ui](https://ui.shadcn.com) + AI Elements |
| Markdown | [Streamdown](https://streamdown.dev) |
| F1 data | [OpenF1 API](https://openf1.org) |
| Sandbox | [microsandbox](https://www.npmjs.com/package/microsandbox) VM |
| Observability | [OpenObserve](https://github.com/maccarlton25/openobserve) + OpenTelemetry |
| Caching | Session-lifecycle-aware in-memory TTL cache |
| Model | Anthropic Claude (via Vercel AI Gateway) |

## Learn More

- [eve docs](https://eve.dev/docs) — framework documentation (also bundled at `node_modules/eve/docs/`)
- [Next.js docs](https://nextjs.org/docs) — App Router guide
- [OpenF1 API](https://openf1.org) — F1 data endpoints
- [Geist design](https://vercel.com/geist) — design system
- [Vercel Sandbox](https://vercel.com/docs/sandbox) — sandbox platform docs
