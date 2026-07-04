# AutopilotQA — Claude Code Context

## Project Overview
AutopilotQA is a web QA testing tool built for the Browser Use Web Agents Hackathon at Y Combinator. It uses autonomous browser agents to simulate real user personas navigating a website, identify UX friction points, and replay recorded user flows to catch regressions after deploys.

There are two core features:
1. **Persona Simulator** — runs a browser agent as a specific user persona (non-technical, impatient, international, mobile) against a URL + goal, and generates a friction report
2. **Flow Monitor** — records a critical user journey once, then replays it on demand to verify it still works (intent-based, not selector-based)

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS (dark mode), lives in `/frontend`
- **Backend:** FastAPI (Python), lives in `/backend`
- **Browser Automation:** `browser-use` library with Playwright
- **LLM:** Anthropic Claude claude-sonnet-4-6 via the `anthropic` Python SDK
- **Database:** Supabase (Postgres) for persisting flows and run history
- **Infrastructure:** docker-compose runs both frontend and backend

## Project Structure
```
autopilot-qa/
├── backend/
│   ├── main.py              # FastAPI app, all route definitions
│   ├── personas.py          # Persona prompt templates
│   ├── agent.py             # Browser-use agent orchestration
│   ├── analyzer.py          # Claude calls for report generation
│   ├── supabase_client.py   # Supabase init and helper queries
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── PersonaTest.jsx
│   │   │   └── FlowMonitor.jsx
│   │   └── components/
│   │       ├── ActivityFeed.jsx   # SSE live log stream
│   │       ├── FrictionReport.jsx
│   │       ├── FlowList.jsx
│   │       └── RunResult.jsx
│   └── package.json
├── docker-compose.yml
└── CLAUDE.md
```

## Key Data Models

### Supabase Tables

**flows**
```
id: uuid
name: string
url: string
steps: jsonb  -- array of {intent, url, element_description}
created_at: timestamp
```

**runs**
```
id: uuid
flow_id: uuid (FK -> flows)
timestamp: timestamp
steps_results: jsonb  -- array of {intent, passed, screenshot_base64, failure_reason}
summary: string
overall_passed: bool
```

### API Response Shapes

**Persona Test Result**
```json
{
  "completed": true,
  "abandonment_risk": "medium",
  "friction_points": [
    { "page": "pricing", "description": "CTA button label is ambiguous" }
  ],
  "summary": "...",
  "actions_log": ["...", "..."]
}
```

**Flow Run Result**
```json
{
  "flow_id": "uuid",
  "overall_passed": false,
  "summary": "...",
  "steps_results": [
    { "intent": "click sign up", "passed": true, "failure_reason": null },
    { "intent": "see confirmation message", "passed": false, "failure_reason": "Element not found" }
  ]
}
```

## API Endpoints
- `POST /api/run-persona-test` — run agent as a persona against a URL + goal
- `GET /api/run-persona-test/stream` — SSE stream of live agent actions during a run
- `POST /api/record-flow` — record a new user flow
- `GET /api/flows` — list all saved flows
- `GET /api/flows/:id` — get a single flow with its last run
- `POST /api/replay-flow/:id` — replay a saved flow and store results

## Personas
Defined in `backend/personas.py` as prompt template strings. Four types:
- `non_technical` — reads carefully, confused by jargon, unfamiliar with web conventions
- `impatient` — skips reading, clicks first plausible thing, gives up quickly
- `international` — unfamiliar with US-centric UX patterns, looks for visual cues
- `mobile` — expects thumb-friendly layout, frustrated by popups and small tap targets

When adding or modifying personas, keep them written as **instructions to an AI agent** acting as that user — not descriptions of the user.

## Agent Behavior Notes
- Browser-use agents should capture **intent-level** steps, not raw DOM selectors — this makes recorded flows resilient to UI changes
- Each agent run should log actions in a format suitable for SSE streaming to the frontend
- The persona prompt should be injected as a system-level instruction before the agent begins navigating
- After each run, pass the full action log to Claude claude-sonnet-4-6 to generate the friction report — don't try to analyze inline during the run

## Environment Variables
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
PLAYWRIGHT_HEADLESS=true
```

## Development Priorities
This is a hackathon project — optimize for working demos over production robustness.
1. Get Persona Simulator end-to-end working first (most visually impressive for demo)
2. Add Flow Monitor second (makes the "real product" story convincing to judges)
3. SSE live activity feed is polish — add last, after core flows work

## Common Pitfalls to Avoid
- Don't use raw CSS selectors anywhere in stored flow steps — always store intent descriptions
- Don't block the FastAPI event loop during browser agent runs — use `asyncio` and `run_in_executor` if needed
- Keep Claude prompts for report generation separate from agent navigation prompts — they serve different purposes
- Screenshots in run results should be base64-encoded PNGs, sized down to keep Supabase payloads reasonable
