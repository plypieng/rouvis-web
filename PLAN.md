# ROuvis — plan.md (Master Context for AI Coding Agent)

> **Mission**  
> Build a **chat-first, MCP + multi-agent** farming assistant for Japan. Farmers can manage fields entirely through conversation (“**vibe farming**”), while decisions are grounded in **JMA weather, satellite, sensors, and guidebooks**. Launch an MVP by end of December for real-life testing.

---

## 0) Product at a Glance

- **Name:** ROuvis  
- **Primary users:** Young/new farmers in Niigata/Nagaoka (JA partners later)  
- **Core promise:** “Say it, it’s done.” e.g., *“I watered plot A 20L”* → logged, scheduled, and reflected in dashboards.  
- **Key differentiators:**  
  - **Chat-only** control with **evidence cards** (citations + confidence)  
  - **JP-first integrations** (JMA, GSI, Tellus, SORACOM, LINE)  
  - **Low AI unit cost** via default lightweight model, smart routing, caching  
  - **Operational** (not just advisory): records, schedules, compliance, procurement

---

## 1) MVP Scope (Real-life Testing)

**Included**
- Web App (ChatKit) + auth (NextAuth Google)
- Chat → Action: water/fertilize/harvest logging (idempotent, undo)
- Agents (AgentKit): **Planner**, **Weather & Risk**, **Crop Coach**, **Scheduler**
- Data/Tools: **JMA weather**, **GSI maps**, **Google Calendar**, **SendGrid email**
- Knowledge: JP guidebook PDFs → RAG (embeddings + citations)
- Services: MCP Orchestrator, Model Router, Command Bus (Upstash Redis), Activity, Fields, Scheduler, RAG
- Storage: Vercel Postgres, Pinecone (Tokyo), Cloudflare R2 (Tokyo)
- Observability: OTel → Grafana Cloud; usage metering
- Evidence cards (citations + confidence) in chat

**Deferred (NEXT/LATER)**
- Mobile app, Vision diagnosis, LINE/FCM push, Tellus NDVI, Compliance guardrails, JP payments (GMO-PG/SBPS), Inventory/Procurement.

---

## 2) Architecture Overview

- **UI:** Web PWA using **OpenAI ChatKit**; later Mobile (Expo + ChatKit).  
- **API Gateway (Edge):** Vercel Edge/Functions (MVP) → AWS API GW + Lambda/ECS (scale).  
- **MCP Orchestrator:** intent routing, policies, budgets, caching, tool permissions.  
- **Agent platform:** **OpenAI AgentKit** (Planner → Weather → CropCoach → Scheduler); Builder for visual workflows; Evals for trace grading.  
- **Model Router:** default **chatgpt-5-mini**; escalate **chatgpt-5-pro-vision** for vision/complex; budget guard + terse mode.  
- **Command Bus:** Upstash Redis Streams (MVP) → SQS/SNS or MSK(Kafka) (scale).  
- **Domain services:** Activity (CQRS), Fields, Scheduler, RAG, (later Vision, Compliance, Procurement).  
- **Data:** Vercel Postgres (RLS + events/projections), Pinecone vector, R2 objects.  
- **JP-first external providers:**  
  - **Weather:** 気象庁(JMA) (primary), OpenWeather/Weathernews (alt)  
  - **Satellite:** Tellus(JAXA/さくら) (next), Sentinel Hub/GEE (alt)  
  - **IoT:** SORACOM (next), AWS IoT Core (later)  
  - **Maps:** 国土地理院(GSI) tiles/elevation (primary), Yahoo!地図/Mapbox (alt)  
  - **Notify:** LINE Messaging API (next), Expo/FCM/APNs (next)  
  - **Calendar/Email:** Google Calendar, SendGrid → AWS SES (scale)  
  - **Payments:** GMO-PG / SBペイメント (next), Stripe JP (alt)

> See `docs/architecture.d2` for the “diagram-as-code” (D2) with `[MVP]/[NEXT]/[LATER]` tags.

---

## 3) Repos & Branching

rouvis-backend/ # Next.js 14 (Route Handlers), MCP, Agents bridge, REST/SSE
rouvis-web/ # Next.js 14 (App Router), ChatKit UI, evidence/action cards
rouvis-mobile/ # (NEXT) Expo + ChatKit + camera


- Branches: `main` (prod), `stage` (preview), `dev` (active)  
- PRs require CI (lint/typecheck/build) + preview deploy  
- CODEOWNERS & PR template for speed

---

## 4) Environment (.env.sample for both repos)

Models
OPENAI_API_KEY=
MODEL_DEFAULT=chatgpt-5-mini # fallback-safe: gpt-4o-mini
MODEL_VISION=chatgpt-5-pro-vision # fallback-safe: gpt-4o

Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

Backend URL for web
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

AgentKit/ChatKit
NEXT_PUBLIC_WORKFLOW_ID=wf_xxx

Data
DATABASE_URL=postgres://user:pass@host:5432/db
PINECONE_API_KEY=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

Queue
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

Mail / Calendar
SENDGRID_API_KEY=
GOOGLE_CALENDAR_CREDENTIALS_JSON=

---

## 5) Data Model (MVP tables)

- `users(id, email, tenant_id, role, created_at)`  
- `fields(id, user_id, name, geojson JSONB, crop, created_at)`  
- `activities(id, user_id, field_id, type ENUM(watering,fertilizer,harvest), qty, unit, note, at, created_at)`  
- `chat_sessions(id, user_id, created_at)`  
- `chat_messages(id, session_id, role, content, tokens_in, tokens_out, model, created_at)`  
- `events(id, tenant_id, type, payload JSONB, ts)`  *(event store/outbox)*

**Indexes:** foreign keys, `GIN` on `geojson`, time-based indexes for activity queries.  
**RLS:** all selects/inserts filtered by `tenant_id` (future multi-tenant).

---

## 6) API Surface (MVP)

- `POST /v1/chat/stream` (SSE) → MCP → AgentKit workflow → stream tokens + tool events  
- `POST /v1/activities` (`Idempotency-Key` header) → create log  
- `GET /v1/activities?limit=50` → latest activities  
- `POST /v1/fields` → create/update plot (GeoJSON)  
- `GET /v1/fields` → user plots  
- `GET /v1/search?q=...` → RAG passages + citations  
- `GET /v1/health` → `{ ok, db, time }`

**Webhooks (later):** `/webhooks/usage.created`, `/webhooks/task.completed`

---

## 7) Multi-Agent Plan (AgentKit)

**MVP:**  
1. **Planner** → task graph from user intent  
2. **Weather & Risk** (JMA) → frost/rain risks + mitigations  
3. **Crop Coach** (RAG) → actions with citations + confidence  
4. **Scheduler** (Calendar/Email) → ToDos, reminders

**NEXT:**  
5. **Vision Doctor** (photo triage/diagnosis + disclaimer)  
6. **Compliance/Record** (chemical guardrails, human confirm)  
7. **Satellite Scout** (Tellus NDVI anomalies)  
8. **Sensor & Field** (SORACOM thresholds)  
9. **Procurement** (payments + suppliers)

---

## 8) Chat → Action (Intent→Command→Event)

- Parse utterances: *“水やり 20L をA圃場 6:30に”* → `LOG_ACTIVITY` command  
- **Idempotency-Key** = `chat:<session>:<messageId>`  
- **Bus** publishes command; Activity service writes & emits `ActivityLogged`  
- Projections update; chat shows **confirmation + Undo** card

---

## 9) Models & Cost Strategy

- Default: **chatgpt-5-mini** (cheap, tool-use competent)  
- Escalate: **chatgpt-5-pro-vision** for vision/complex reasoning  
- **Guards:** output-length caps, caching by grounding hash, terse mode if monthly budget ≥80%  
- Knowledge that rarely changes (guidebooks): **RAG first**, optional **SFT** later  
- Dynamic info (weather/satellite/sensors): **no fine-tune**, inject via tools

---

## 10) Observability, SLOs, Resilience

- **Traces/logs/metrics:** OTel → Grafana Cloud; Vercel Analytics  
- **SLOs:** p95 chat latency ≤ **2.0s**, availability ≥ **99.5%**  
- **Resilience:** timeouts, retries, circuit breakers; **DLQ** for failed commands; **outbox** on writes  
- **Security:** RLS, signed URLs for media, JWT scopes, audit logs for agent/tool actions

---

## 11) Development Plan (Nov–Dec, 8 Weeks)

**W1** Foundations: repos, env, Postgres/Pinecone/R2, ChatKit web, NextAuth, MCP/Router, health checks  
**W2** Agents+Bus: Planner/Weather/CropCoach/Scheduler, Upstash Streams, Activity/Fields CQRS, GSI base  
**W3** RAG & Flow: guidebooks→embeddings, citations, “cold-snap” E2E (tasks + calendar + email), analytics  
**W4** Closed β-0 (5–10 farmers): bug triage, prompt/cost tuning, Undo, p95 ≤ 2.0s  
**W5** Images attach + light Vision (top-3 classes + disclaimer); store to R2  
**W6** Notifications polish: Email/Calendar hardening; LINE/FCM stubs  
**W7** Tellus NDVI pilot (1–2 plots) + anomaly cards  
**W8** β-1 (20–30 farmers) & hardening: rate limits, audit logs, admin mini-console, Go/No-Go

**MVP Acceptance**
- Logs (watering/fertilizer/harvest) with undo; “cold snap?” produces scheduled tasks + email; citations & confidence shown; p95 ≤2.0s; cost/convo under target.

---

## 12) KPIs & Budget

- **KPIs:** D1 ≥ 60%, D7 ≥ 40%, tasks/convo ≥ 1.5, AI cost/revenue ≤ 15%, 5xx < 1%  
- **Budget (2 mo from ¥1.5M):** Cloud/AI ~¥200k; farmer incentives ~¥300k; JP provider credits ~¥100k; UX/docs ~¥150k; eval datasets ~¥100k; legal ~¥100k; buffer ~¥550k

---

## 13) Risks & Mitigations

1. **Advice accuracy** → citations + confidence, human confirm for chemicals, eval gates  
2. **Data gaps (clouds, sensor offline)** → uncertainty mode; ask for photo/measurements  
3. **Chat-only learning curve** → quick-action buttons, tutorial prompts  
4. **Token runaway** → output caps, caching, terse mode  
5. **Ops incidents** → runbook, rollback, snapshots, alarms

---

## 14) Coding Conventions & Agent Guardrails

- **TypeScript strict**, zod-validated inputs, idempotent POSTs  
- **Command/Event names:** SCREAMING_SNAKE_CASE; payloads are minimal & typed  
- **Guardrails:** always cite sources when prescribing actions; require confirm for chemicals; decline if data is insufficient  
- **Localization:** Japanese first, system prompts set `locale=ja`  
- **Testing:** smoke (curl/SSE), contract tests on `/v1/*`, eval datasets for agent flows

---

## 15) Day-1 Execution (Windsurf Prompt)

See `docs/day1_prompt.md` (contains unified ENV, backend routes: `/v1/health`, `/v1/chat/stream`, Prisma schema & migrations, minimal chat UI wiring with ChatKit fallback).

---

## 16) Roadmap After MVP

- **Mobile (ChatKit)** + camera flows  
- **Vision Doctor** full triage + confidence maps  
- **LINE/FCM pushes**, **Tellus NDVI** across plots, **Compliance guardrails**  
- **Payments (GMO-PG/SBPS)**, **Inventory/Procurement**, **JA dashboards**  
- Migrate to **AWS (Aurora/S3/API GW/Lambda or ECS)**; queue to SQS/MSK

---

### Appendix A — Minimal RAG Ingestion Steps
1) Extract PDFs (guidebooks) → clean text → chunk (≈800–1200 chars with overlap)  
2) Embed → Pinecone upsert with `{tenant_id, source, page}` metadata  
3) `/v1/search` returns top-k with snippet + URL; MCP injects citations into replies

### Appendix B — Example Intent Regex (MVP)
- Watering: `/水やり|潅水|散水|water(ed|ing)?/i`  
- Quantity: `/(\d+)\s?(l|リットル)/i`  
- Field name dictionary from `fields` table

### Appendix C — Idempotency
- Header: `Idempotency-Key: chat:<sessionId>:<msgId>`  
- Store keys 24h; return same result if retried

---

**Owner:** CTO (backend/infra/agents), CEO/PM (AgentKit workflow, connectors, UX, pilot ops)  
**Goal:** MVP live with 10–30 farmers by end of December; validated “chat → farm ops” loop with low cost and high trust.