# SCM AI POC

A Supply Chain Management AI application built on SAP CAP, demonstrating real
SAP GenAI Hub integration across three specialist agents, with a Joule-inspired
React chat UI — all served from a single CAP service.

This project exists to prove out the architecture for **`cds-ai-tracker`**, a
planned CAP plugin for automatic AI usage tracking (per-user, per-agent token
and cost logging). The plugin is the actual hero of this work; this app is the
proving ground.

---

## What's In Here

```
scm-ai-poc/
  ├── app/
  │     └── copilot/              React chat UI ("SCM Copilot"), served by CAP
  │           ├── src/             React source (components, API client, styles)
  │           └── dist/            Built output — what CAP actually serves
  │
  ├── db/
  │     ├── schema.cds            SCM domain model (Suppliers, Products, POs, Shipments)
  │     └── data/*.csv             Mock SCM data
  │
  ├── srv/
  │     ├── agents/                Inventory / Delivery / SupplierRisk agents
  │     ├── prompts/               System + few-shot prompt builders per agent
  │     ├── router/                Intent detection (keyword/phrase scoring)
  │     ├── helpers/
  │     │     ├── db-helper.js     All database queries, centralized
  │     │     └── remote-call-helper.js   Calls the GenAI bridge
  │     ├── utils/                 constants, errors, logger, validator, formatter
  │     ├── chat-service.cds       OData service definition + role requirements
  │     └── chat-service.js        Thin orchestrator (validate → route → run agent)
  │
  ├── genai-bridge/                Python bridge to SAP GenAI Hub
  │     ├── call_llm.py            Calls litellm.completion(model="sap/gpt-4o")
  │     └── venv/                  Python virtual environment (gitignored)
  │
  ├── test/
  │     ├── unit/                  153+ Jest tests (utils, router, helpers, agents)
  │     └── integration/
  │
  ├── test.http                    VS Code REST Client file — full scenario coverage
  ├── xs-security.json             XSUAA role/scope definitions
  └── package.json
```

---

## Architecture

```
User (browser)
      │
      ▼
React UI (app/copilot)  ──same origin, relative paths, no CORS──┐
      │                                                          │
      ▼                                                          │
CAP OData Service (/scm-chat/*)  ◄────────────────────────────────┘
      │
      ├── validator.js     sanitize input
      ├── agent-router.js  detect intent (inventory / delivery / supplier)
      │
      ▼
Agent (extends BaseAgent)
      │
      ├── db-helper.js          fetch real SCM data (SQLite)
      ├── prompts/*.js          build system + few-shot + context prompt
      └── remote-call-helper.js
                │
                ▼
        genai-bridge/call_llm.py   (Python subprocess, file-based I/O)
                │
                ▼
        litellm.completion(model="sap/gpt-4o")
                │
                ▼
        SAP GenAI Hub (Orchestration Service)
```

Why a Python subprocess for the AI call: SAP's GenAI Hub Orchestration Service
uses a request shape that `litellm`'s native SAP provider already handles
correctly. Replicating that by hand in Node.js proved unreliable (intermittent
404s/503s from subtle shape mismatches), so Node spawns a small Python script
that does the proven call and returns JSON via temp files — simpler and more
reliable than piping over stdin/stdout.

If the GenAI bridge is unavailable or SAP returns an error, every agent falls
back to a **question-aware simulated response** built directly from the real
database context — the user always gets a useful answer, and the response
clearly indicates `simulated: true` so this is never hidden.

---

## The Three Agents

| Agent | Domain | Example Questions |
|---|---|---|
| **InventoryAgent** | Stock levels, reorder alerts | "What products are critically low on stock?" |
| **DeliveryAgent** | Shipment tracking, delays | "Are there any delayed shipments?" |
| **SupplierRiskAgent** | Supplier reliability, risk scores | "Which suppliers are high risk?" |

A keyword/phrase-scoring router (`srv/router/agent-router.js`) auto-detects
intent from the message text, or an explicit `agentHint` can force a specific
agent.

---

## Roles & Auth

XSUAA mocked locally, real XSUAA at BTP deployment time (same code, different
`package.json` profile):

| Role | Can Access |
|---|---|
| `SCMViewer` | Read-only: Suppliers, Products, PurchaseOrders, Shipments |
| `SCMAnalyst` | Viewer access + call all 3 agents + chat router |
| `SCMAdmin` | Everything Analyst has |

Mocked dev users (username = password): `admin`, `analyst`, `viewer`.

---

## Running Locally

### Prerequisites
- Node.js v18+ (tested on v22)
- `@sap/cds-dk` installed globally
- Python 3.10+ with `litellm` and `python-dotenv` installed in `genai-bridge/venv`
- A SAP AI Core service key with an Orchestration Service deployment (for real
  GenAI Hub calls — the app works in simulation mode without this)

### 1. Start the CAP service

```bash
cds watch
```

Runs at `http://localhost:4004` with SQLite in-memory DB, mock data loaded
automatically.

### 2. Configure the GenAI bridge (optional — for real AI responses)

```bash
cd genai-bridge
python -m venv venv
venv\Scripts\activate        # Windows
pip install litellm python-dotenv
```

Create `genai-bridge/.env`:
```
AICORE_AUTH_URL=https://your-subdomain.authentication.<region>.hana.ondemand.com
AICORE_CLIENT_ID=sb-xxxxx!bxxxxx|aicore!bxxxxx
AICORE_CLIENT_SECRET=your-client-secret
AICORE_BASE_URL=https://api.ai.prod.<region>.aws.ml.hana.ondemand.com
AICORE_RESOURCE_GROUP=default
LITELLM_MODEL=sap/gpt-4o
```

Without this, every agent call gracefully falls back to a simulated response
built from real mock data.

### 3. Build and view the chat UI

```bash
cd app/copilot
npm install
npm run build
```

Then open `http://localhost:4004/copilot/dist/index.html` (CAP serves the
built UI directly — same origin as the API, no CORS configuration needed).

For UI development with hot-reload, `npm run dev` inside `app/copilot` runs
a separate Vite dev server on `:5173` — but the real integration test is
always against the CAP-served `dist/` build.

### 4. Run tests

```bash
npm test                  # all tests
npm run test:unit         # unit tests only
npm run test:coverage     # with coverage report
```

### 5. Test via REST Client

Open `test.http` in VS Code with the **REST Client** extension
(`humao.rest-client`) installed — every endpoint, role, and validation case
is pre-built with one-click "Send Request" links.

---

## Key Design Decisions

| Decision | Reasoning |
|---|---|
| All DB queries in `db-helper.js` | One place to optimize, mock, or swap SQLite → HANA |
| Router has zero agent knowledge | Adding a new agent never requires router changes |
| Prompts live in separate files | Prompt tuning doesn't touch agent business logic |
| Custom error classes (`utils/errors.js`) | Callers know exactly what failed and why |
| Simulation fallback everywhere | App stays usable even when GenAI Hub is down |
| GenAI bridge uses files, not stdin/stdout piping | Stdin/stdout buffering caused intermittent silent failures; files are simple, atomic, and inspectable mid-debug |
| UI calls relative paths, no hardcoded host | Same code works unchanged from localhost to BTP production |
| UI lives in `app/copilot`, built and served by CAP | Same-origin in production — zero CORS configuration ever needed |

---

## What's Next

```
⬜ cds-ai-tracker plugin
     The actual goal of this project: a CAP plugin (`tracker.wrap()`)
     that automatically logs every AI call — user, agent, model,
     tokens, cost, duration — with zero changes to agent code beyond
     wrapping the existing GenAI call. This app exists to prove the
     plugin works in a real, multi-agent, production-shaped CAP service.

⬜ Production hardening
     HANA Cloud (replacing SQLite), async job queue for long AI calls,
     GitHub Actions CI/CD, MTA deployment to BTP Cloud Foundry.
```

---

## Test Coverage

153+ tests across utils, router, helpers, agents, and prompts. Run
`npm run test:coverage` for the full breakdown.

| Layer | What's Tested |
|---|---|
| `utils/` | Validation rules, error classes, response formatting, logging |
| `router/` | Intent detection by keyword, phrase, hint, and confidence scoring |
| `helpers/` | DB query aggregation, GenAI bridge call/fallback/error handling |
| `agents/` | Context fetching, prompt building, simulation fallback responses |
| `prompts/` | Context formatting per agent, message array structure |