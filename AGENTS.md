# F1 Pit Wall — eve Agent App

This project uses the eve framework. Before writing code, read the relevant
guide from the installed eve package docs at `node_modules/eve/docs/`.

## What this is

An interactive Formula One chat agent. Users ask questions about F1 (schedules,
drivers, results, lap times) and the agent fetches live data from the OpenF1
API via typed tools, then weaves the data into a conversational answer.

## Architecture (3 layers)

### Layer 1: Agent (`agent/`)

eve is filesystem-first — the agent IS a directory of files:

- `agent.ts` — runtime config (which AI model to use)
- `instructions.md` — the system prompt (identity, when to call tools)
- `tools/*.ts` — typed actions the model can call (each file = one tool)
- `channels/eve.ts` — HTTP API auth policy

The model reads instructions, decides which tools to call, executes them, and
streams a response back. Tools run in the app runtime (not a sandbox) with
full access to `process.env` and `fetch`.

### Layer 2: Next.js app (`app/`)

- `next.config.ts` wraps the config with `withEve()` — this mounts the eve
  HTTP routes (`/eve/v1/session*`) on the same origin as the Next.js app
- `layout.tsx` sets up Geist fonts and the dark-first theme
- `page.tsx` renders the chat component
- `_components/agent-chat.tsx` is the main UI — it uses `useEveAgent()` from
  `eve/react` to manage chat state, send messages, and stream responses

### Layer 3: UI components (`components/`)

- `ai-elements/` — chat-specific components (Conversation, PromptInput,
  Message, Tool, Reasoning) built on top of shadcn/ui
- `ui/` — shadcn/ui primitives (Button, Tooltip, Dialog, etc.)

## Data flow

1. User types in the PromptInput or clicks a suggested question
2. `useEveAgent().send({ message })` POSTs to `/eve/v1/session`
3. eve creates a durable session, runs the model loop
4. The model calls tools (e.g. `get_race_schedule`) which fetch from OpenF1
5. Results stream back as NDJSON events (`message.appended`, `action.result`)
6. `useEveAgent` projects events into `data.messages[]`
7. `AgentMessage` renders each message — text via Streamdown (markdown),
   tool calls via the Tool component, reasoning via the Reasoning component

## Tools

All tools fetch from the OpenF1 API (https://api.openf1.org/v1/) and use
the shared caching layer (`lib/f1/`) with session-aware TTLs.

### Always-available

| Tool | Purpose | Live TTL | Post TTL |
|------|---------|----------|----------|
| `get_championship_standings` | Driver + constructor points (computed from results) | 1h | 24h |
| `get_weekend_schedule` | Full weekend: all sessions with times + circuit info | 1h | 24h |
| `get_next_session` | Next upcoming session of any type + countdown | 5min | 1h |
| `get_circuit_info` | Track layout image, length, type, country | 24h | 24h |
| `get_driver_info` | Driver bio, number, team, headshot, team color | 1h | 24h |

### Race weekend

| Tool | Purpose | Live TTL | Post TTL |
|------|---------|----------|----------|
| `get_session_results` | Results for any session type (practice, quali, race) | 30s | 24h |
| `get_qualifying_breakdown` | Q1/Q2/Q3 times, pole sitter, sector breakdown | 30s | 24h |
| `get_fastest_laps` | Fastest lap per driver + overall fastest | 30s | 24h |

### Live race

| Tool | Purpose | Live TTL | Post TTL |
|------|---------|----------|----------|
| `get_live_leaderboard` | Positions, computed gaps, lap count, last lap | 15s | 24h |
| `get_pit_stops` | Pit stop lap, duration, driver | 15s | 24h |
| `get_weather` | Track/air temp, humidity, wind, rain | 30s | 24h |
| `get_driver_telemetry` | Speed, gear, RPM, throttle, brake, DRS (sampled) | 5s | 24h |

### Post-session

| Tool | Purpose | Live TTL | Post TTL |
|------|---------|----------|----------|
| `get_lap_times` | Lap-by-lap with sectors, speeds, pit flag | 30s | 24h |
| `get_position_history` | Full position timeline for charting overtakes | 30s | 24h |

Each tool uses `toModelOutput` to project full structured data down to a
text summary for the model — keeping model context small while the UI
renders rich visualizations from the full data.

## Generative UI

Tool outputs are routed to visualization components in `app/_components/f1/`
by tool name. The `agent-message.tsx` component checks `part.toolName` and
renders the matching visualization. Tools without custom visualizations
fall back to the default JSON display.

## Caching

The cache (`lib/f1/cache.ts`) uses an in-memory Map with session-lifecycle-
aware TTLs. During a live race, data refreshes every 15-30 seconds. After
the race, data is cached for 24 hours (it's immutable). For production at
scale, swap the Map for Vercel Runtime Cache — same interface, one file.

## Auth

The channel (`agent/channels/eve.ts`) uses `none()` for public access —
no authentication required. This is intentional for a learning exercise.
For a production app, replace `none()` with a real auth provider.

## Adding new capabilities

1. **New tool**: Create `agent/tools/your_tool.ts` using `defineTool`
2. **New skill**: Create `agent/skills/your_skill.md` with a procedure
3. **New connection**: Create `agent/connections/your_connection.ts`
4. **Update instructions**: Edit `agent/instructions.md` to tell the model
   when to use the new tool

eve discovers all files automatically — no registration needed.
