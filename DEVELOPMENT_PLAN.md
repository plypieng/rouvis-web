# ROuvis MVP Development Plan — **Revised (Aligned with plan.md & D2)**

> **Legend:**
> **[MVP]** must-ships for real-life testing by end of Dec
> **[NEXT]** ships after MVP (Jan onward / optional if time allows)
> **[LATER]** nice-to-have / scale

---

## Executive Summary
The current prototype covers basic chat/analytics but misses **[MVP]** blocks defined in plan.md/D2. This revision locks the **8-week** path to field-testing by end of December, adds **AgentKit fallback**, **API productization**, **budget guard/terse mode**, and **data migration rollback**.

---

## Current State Analysis

### Prototype Implementation
- **Backend**: Next.js API routes with basic chat streaming, OpenWeather; Prisma: User/ChatMessage only
- **Web**: Next.js chat UI, analytics components, i18n, Google Maps
- **Deployment**: Vercel (web/backend)
- **Features**: GPT-4 chat, weather fetch, simple analytics

### Key Gaps vs MVP
1) **Architecture & Infra**
   - ❌ **[MVP]** MCP Orchestrator, Model Router, **AgentKit** integration
   - ❌ **[MVP]** Command Bus + domain services (Activity/Fields/Scheduler/RAG)
   - ❌ **[MVP]** Pinecone, R2, OTel + usage metering
   - ❌ **[NEXT]** Event-sourcing/CQRS patterns beyond MVP

2) **Data Model**
   - ❌ **[MVP]** activities/fields/events/chat_sessions tables, indexes, (future) RLS

3) **Multi-Agent**
   - ❌ **[MVP]** Planner/Weather/CropCoach/Scheduler, tool calls, evidence cards

4) **Integrations (JP-first)**
   - ❌ **[MVP]** JMA, GSI, Calendar/SendGrid
   - ❌ **[NEXT]** Tellus, SORACOM, LINE

5) **Chat → Action**
   - ❌ **[MVP]** intent→command→event, idempotency, undo, activity logging

6) **Knowledge & RAG**
   - ❌ **[MVP]** guidebook ingestion, vector search, citations + confidence

---

## Migration Strategy

### Phase 1: **Foundation (Week 1)** — **[MVP]** ✅ **COMPLETED**
**Backend Restructuring** ✅
- ✅ Migrated to **app/api** route handlers (`/v1/chat/stream`, `/v1/health`)
- ✅ Implemented **MCP Orchestrator** with conversation orchestration, policies, and cost guards
- ✅ Created **Model Router** with automatic model selection (**chatgpt-5-mini** default, **chatgpt-5-pro-vision** for vision/complex)
- ✅ Configured **Upstash Redis** for Command Bus with async processing and idempotency
- ✅ Set up **Pinecone (Tokyo)** + **Cloudflare R2 (Tokyo)** environment variables
- ⏭️ OTel observability (deferred to Week 4)

**Database Migration** ✅
- ✅ Updated Prisma schema with complete MVP data model:
  ```prisma
  model User { id, email, tenant_id, role, created_at, updated_at }
  model Field { id, user_id, name, geojson, crop, area_sqm, created_at, updated_at }
  model Activity { id, user_id, field_id, type, qty, unit, note, performed_at, created_at, updated_at }
  model ChatSession { id, user_id, title, created_at, updated_at }
  model ChatMessage { id, session_id, role, content, tokens_in, tokens_out, model, created_at }
  model Event { id, tenant_id, type, aggregate_id, payload, occurred_at }
  model AuditLog { id, user_id, tenant_id, action, resource, details, created_at }
  ```
- ✅ Added comprehensive indexes and relationships
- ✅ Migration ready for Vercel deployment (will run automatically)
- ✅ Rollback plan: DB snapshot before deployment

**Web Updates** ✅
- ✅ Installed **@openai/chatkit-react**
- ✅ Created **RouvisChatKit** component with farming-focused theming, localized copy hooks, and official ChatKit session handshake
- ✅ Added **EvidenceCard** component for citations/confidence/action cards
- ✅ Updated chat page to use ChatKit UI backed by `/api/chatkit/session`
- ✅ Replaced chat proxy with SSE-aware bridge to `/v1/chat/stream`
- ✅ **Desktop-first responsive design** with sidebar navigation and multi-panel layouts

**Feature Flags (env)** ✅
- ✅ AGENTKIT_ENABLED=true (fallback ready)
- ✅ VISION_LITE_ENABLED=false (Week 5)
- ✅ TERSE_MODE_THRESHOLD=0.8 (budget guard)
- ✅ MCP_ONLY_FALLBACK=true

### Phase 2: Core Services (Week 2) — [MVP]
**Domain Services**
- Activity Service: CQRS write + projections + undo
- Fields Service: GeoJSON storage; simple crop metadata
- Scheduler Service: tasks + Google Calendar integration
- RAG Service: guidebook ingestion pipeline

**Command Bus**
- Redis Streams for LOG_ACTIVITY, CREATE_FIELD, SCHEDULE_TASK
- Idempotency via Idempotency-Key header
- Outbox pattern (table) for reliable publish

**AgentKit Integration**
- Builder: Planner (intent→task graph)
- Weather agent (JMA) skeleton
- CropCoach (RAG advice with citations)

**Fallback**
- If AgentKit unstable, orchestrate via MCP-only path (same tools/prompts)

#### W2 Detailed Scope — Agents + Bus + Domain Services

- Deliverables
  - OpenAI Agents SDK integrated with a triage entry and 4 specialized agents (Planner, Weather & Risk, Crop Coach, Scheduler)
  - New endpoint: POST `/v1/agents/run` (SSE) with event/delta format compatible with ChatKit
  - Domain services online: Activity, Fields, Scheduler with idempotent writes over Command Bus
  - Command Bus upgraded: Upstash Redis Streams consumer group + outbox + idempotency
  - Feature flags enforced; budget guardrails (terse mode) evaluated in orchestrator

- Backend (Agents + Orchestrator)
  - Dependencies: `npm i @openai/agents zod`
  - Define agents and tools:
    - Triage agent: routes to Planner, Weather & Risk (JMA), Crop Coach (RAG), Scheduler
    - Tools (zod-validated):
      - `jma.getForecast(lat, lon, at?)`
      - `weather.assessFrostRisk(forecast)`
      - `rag.searchGuides(query, k?)`  (W3: data ingestion; W2 stub acceptable)
      - `fields.listFields()`
      - `activities.logActivity(field_id?, type, qty?, unit?, note?, at?)`
      - `scheduler.createTask(title, due_at, field_id?, notes?)`
  - Runner + streaming:
    - Use model router defaults (**chatgpt-5-mini**; escalate to **chatgpt-5-pro-vision** only when needed)
    - Stream deltas and tool events; normalize to ChatKit’s expected event shape
    - Implement POST `/v1/agents/run`: `{ threadId?, messages? }` → SSE stream
  - Orchestrator integration:
    - If `AGENTKIT_ENABLED=true`, route `/v1/chat/stream` through Runner
    - Else, keep MCP-only path with identical tools/prompts

- Backend (Domain Services + Bus)
  - Activity Service
    - POST `/v1/activities` with `Idempotency-Key=chat:<sessionId>:<msgId>`
    - GET `/v1/activities?limit=50`
    - Emits `ActivityLogged`; support Undo via `DELETE /v1/activities/:id` or `POST /v1/activities/:id/undo`
  - Fields Service
    - POST `/v1/fields` `{ name, geojson, crop? }`
    - GET `/v1/fields` (used for `@field` mentions in ChatKit)
  - Scheduler Service
    - POST `/v1/tasks` `{ title, due_at, field_id?, notes? }`
    - Dev stub for Google Calendar (full integration in W4)
  - Command Bus (Upstash Redis Streams)
    - Stream: `rouvis.commands`; consumer group: `agents`
    - Commands: `LOG_ACTIVITY`, `CREATE_FIELD`, `SCHEDULE_TASK`
    - Outbox table for reliable publish; ack after durable write
    - Idempotency window: 24h per key

- Web (ChatKit)
  - Feature flag to route `/api/chat` proxy → `/v1/agents/run`
  - Render tool events (queued/completed) and confirmation/undo cards
  - Evidence cards: show citations/confidence when present
  - Entity suggestions for `@field` via `/v1/fields`

- Testing & Exit Criteria (W2)
  - Contract tests for: `/v1/agents/run`, `/v1/activities`, `/v1/fields`, `/v1/tasks`
  - SSE smoke test (curl) confirms streaming and consistent event format
  - Idempotency retry returns same result for identical key
  - Exit: “水やり 20L をA圃場” logs an activity via bus with Undo; triage→weather/crop-coach handoff is observable; scheduler accepts a task stub

### Phase 3: Agent Workflows & RAG (Week 3) — [MVP]
**Workflows**
- Planner → Weather & Risk (JMA) → CropCoach (RAG) → Scheduler (Calendar/Email)
- Confidence scoring + citations in output

**RAG**
- JP PDFs → clean → chunk (800–1200 chars) → embed → Pinecone upsert
- /v1/search returns passages + sources

**Chat → Action**
- Regex + LLM-assist intent parsing
- Execute commands; undo flows; confirmation cards in chat

### Phase 4: Integrations & API productization (Week 4) — [MVP]
**JP-first**
- JMA primary, GSI tiles/elevation
- Google Calendar + SendGrid email
- R2 for images/PDFs

**API productization**
- Publish /openapi.yaml
- Add API Keys with scopes, rate limits per key
- Usage endpoints: GET /v1/usage?since=... (per tenant/agent/model)
- Audit logs for every agent/tool call

**Testing**
- Contract tests on /v1/*
- E2E "cold snap" scenario

### Phase 5: Vision-lite (Week 5) — [NEXT-lite]
- Photo upload + attach to activities (R2)
- Quick triage via …-pro-vision (top-3 classes + disclaimer)
- Turn on VISION_LITE_ENABLED=true

### Phase 6: Notifications polish (Week 6) — [MVP]
- Harden Email/Calendar notifications (templates for frost/heavy rain)
- Stage LINE/FCM stubs (no mass send yet)

### Phase 7: Tellus NDVI pilot (Week 7) — [NEXT]
- Ingest NDVI for 1–2 plots; anomaly → chat card w/ mitigation
- Handle cloudy fallbacks

### Phase 8: β-1 & Hardening (Week 8) — [MVP]
- 20–30 farmers; rate limits; JWT scopes; audit logs; admin mini-console
- Go/No-Go for January rollout

## Technical Debt & Risks (unchanged + mitigations)
- Architecture overhaul → incremental migration, feature flags, dual-run prototype
- AgentKit complexity → MCP-only fallback path
- JP APIs variance → backups (OpenWeather/Mapbox), error budgets
- Data migration → snapshot + rollback scripts; dry-run on staging

## Success Criteria
**Functional ([MVP])**
- "水やり 20L をA圃場" → Activity logged (idempotent) with Undo
- Evidence cards show citations + confidence
- Cold snap flow creates tasks + calendar event + email
- /openapi.yaml, API keys, /v1/usage, audit logs available

**Performance/Operational**
- p95 chat latency ≤ 2.0s, 5xx < 1%, AI cost/convo ≤ target
- D1 ≥ 60%, D7 ≥ 40%

## Timeline & Milestones (week-by-week)
- **W1** ✅ Foundation (MCP, Router, DB, R2, Pinecone, ChatKit web, migration + rollback)
- W2 Domain services + Bus + AgentKit skeleton (Planner/Weather/CropCoach/Scheduler)
- W3 Workflows + RAG + Chat→Action + Undo + Citations/Confidence
- W4 Integrations (JMA/GSI/Calendar/Email/R2) + API productization
- W5 Vision-lite (attach + quick triage)
- W6 Notifications polish (Email/Calendar; LINE/FCM stubs)
- W7 Tellus NDVI pilot (1–2 plots)
- W8 β-1, hardening, Go/No-Go

## Dependencies & Prereqs
- OpenAI keys (chatgpt-5-mini / pro-vision)
- Pinecone (Tokyo), R2 (Tokyo), Upstash Redis
- JMA, GSI, Google Calendar/SendGrid credentials
- ENV flags: AGENTKIT_ENABLED, MCP_ONLY_FALLBACK, VISION_LITE_ENABLED, TERSE_MODE_THRESHOLD

## Next Steps
- ✅ **Week 1 Complete** - Foundation established with MCP Orchestrator, Model Router, Command Bus, database schema, and ChatKit UI
- **Start Week 2** - Domain services, CQRS, and agent skeletons
- Deploy to Vercel to trigger database migration
- Test chat flow with new architecture

---

*This revision keeps MVP laser-focused, bakes in fallbacks and API productization, and matches the D2+plan.md roadmap to hit December field tests.*