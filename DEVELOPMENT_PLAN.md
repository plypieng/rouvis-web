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

### Phase 1: **Foundation (Week 1)** — **[MVP]**
**Backend Restructuring**
- Migrate to **app/api** route handlers
- Implement **MCP Orchestrator (skeleton)** + **Model Router** (default `chatgpt-5-mini`, escalate `…-pro-vision`)
- Configure **Upstash Redis Streams** for Command Bus (DLQ later)
- Set up **Pinecone (Tokyo)** + **Cloudflare R2 (Tokyo)**
- **OTel** skeleton + basic usage metering

**Database Migration**
- Update Prisma schema to:
  ```prisma
  model User { id String @id; email String; tenant_id String?; role String?; created_at DateTime @default(now()) }
  model Field { id String @id; user_id String; name String; geojson Json; crop String?; created_at DateTime @default(now()) }
  model Activity { id String @id; user_id String; field_id String; type String; qty Float?; unit String?; note String?; at DateTime?; created_at DateTime @default(now()) }
  model ChatSession { id String @id; user_id String; created_at DateTime @default(now()) }
  model ChatMessage { id String @id; session_id String; role String; content String; tokens_in Int?; tokens_out Int?; model String?; created_at DateTime @default(now()) }
  model Event { id String @id; tenant_id String?; type String; payload Json; ts DateTime @default(now()) }
  ```
- Add indexes (FKs, time), prepare RLS/tenant isolation (flagged off for MVP)
- Data migration plan: export prototype User/ChatMessage → import scripts; create DB snapshot & rollback script before cutover

**Web Updates**
- Swap chat UI to OpenAI ChatKit
- Implement evidence cards and action confirmations
- Update API client to new /v1/* endpoints

**Feature Flags (env)**
- AGENTKIT_ENABLED=true (fallback ready)
- VISION_LITE_ENABLED=false (Week 5)
- TERSE_MODE_THRESHOLD=0.8 (budget guard)
- MCP_ONLY_FALLBACK=true

### Phase 2: Core Services (Week 2) — **[MVP]**
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
- **Fallback**: If AgentKit unstable, orchestrate via MCP-only path (same tools/prompts)

### Phase 3: Agent Workflows & RAG (Week 3) — **[MVP]**
**Workflows**
- Planner → Weather & Risk (JMA) → CropCoach (RAG) → Scheduler (Calendar/Email)
- Confidence scoring + citations in output

**RAG**
- JP PDFs → clean → chunk (800–1200 chars) → embed → Pinecone upsert
- /v1/search returns passages + sources

**Chat → Action**
- Regex + LLM-assist intent parsing
- Execute commands; undo flows; confirmation cards in chat

### Phase 4: Integrations & API productization (Week 4) — **[MVP]**
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

### Phase 5: Vision-lite (Week 5) — **[NEXT-lite]**
- Photo upload + attach to activities (R2)
- Quick triage via …-pro-vision (top-3 classes + disclaimer)
- Turn on VISION_LITE_ENABLED=true

### Phase 6: Notifications polish (Week 6) — **[MVP]**
- Harden Email/Calendar notifications (templates for frost/heavy rain)
- Stage LINE/FCM stubs (no mass send yet)

### Phase 7: Tellus NDVI pilot (Week 7) — **[NEXT]**
- Ingest NDVI for 1–2 plots; anomaly → chat card w/ mitigation
- Handle cloudy fallbacks

### Phase 8: β-1 & Hardening (Week 8) — **[MVP]**
- 20–30 farmers; rate limits; JWT scopes; audit logs; admin mini-console
- Go/No-Go for January rollout

## Technical Debt & Risks (unchanged + mitigations)
- Architecture overhaul → incremental migration, feature flags, dual-run prototype
- AgentKit complexity → MCP-only fallback path
- JP APIs variance → backups (OpenWeather/Mapbox), error budgets
- Data migration → snapshot + rollback scripts; dry-run on staging

## Success Criteria
### Functional ([MVP])
- "水やり 20L をA圃場" → Activity logged (idempotent) with Undo
- Evidence cards show citations + confidence
- Cold snap flow creates tasks + calendar event + email
- /openapi.yaml, API keys, /v1/usage, audit logs available

### Performance/Operational
- p95 chat latency ≤ 2.0s, 5xx < 1%, AI cost/convo ≤ target
- D1 ≥ 60%, D7 ≥ 40%

## Timeline & Milestones (week-by-week)
- W1 Foundation (MCP, Router, DB, R2, Pinecone, OTel, ChatKit web, migration + rollback)
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
- Approve this revised plan
- Create issues per week/milestone + flags
- Start Week 1 foundation (with DB snapshot & rollback in place)

---

*This revision keeps MVP laser-focused, bakes in fallbacks and API productization, and matches the D2+plan.md roadmap to hit December field tests.*