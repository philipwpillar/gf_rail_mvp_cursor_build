# Rail — Household CFO Platform

Rail is a household financial planning application built with Next.js and Supabase. It analyses monthly cashflow and routes surplus through a three-stage optimisation pipeline: building an emergency buffer, eliminating high-cost debt, and transitioning into long-term index fund ownership. The core IP is the Rail Allocation Engine (RAE) — a pure-function algorithm that adapts to income volatility, behavioural commitment, and income-shock risk.

This repository is a read-only prototype. No money moves. Rail recommends. The user acts.

---

## Table of Contents

- [What Rail Does](#what-rail-does)
- [The Three-Stage Pipeline](#the-three-stage-pipeline)
- [Demo Flow](#demo-flow)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Quick Start](#quick-start)
- [Running Tests and Quality Checks](#running-tests-and-quality-checks)
- [API Reference](#api-reference)
- [RAE Decision Model](#rae-decision-model)
- [Key Engineering Decisions](#key-engineering-decisions)
- [Database Tables](#database-tables)
- [Security](#security)
- [Known Limitations and Phase 0B Roadmap](#known-limitations-and-phase-0b-roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What Rail Does

Many households do not struggle because they lack income, but because monthly surplus is never routed in a deliberate order. Without a system, money gets split reactively across savings, debt, and spending — which slows every goal simultaneously.

Rail gives each household one clear answer each month: here is your surplus, here is exactly where it goes, and here is what that means for your financial position in 12, 24, and 60 months.

For each signed-in household, Rail:

1. Reads income, obligations, debts, buffer balance, income stability, and plan commitment from Supabase.
2. Computes monthly discretionary surplus.
3. Classifies the household into its current pipeline stage.
4. Allocates surplus optimally across buffer, debt, and investment buckets.
5. Adjusts for income-shock risk when volatility is elevated.
6. Projects outcomes forward across a 60-month horizon.
7. Stores an immutable audit record of every execution.

---

## The Three-Stage Pipeline

**Stage 1 — Resilience**
Build a minimum emergency buffer (3 weeks of obligations) before anything else. Full surplus flows to the buffer until B_min is met. Once met, surplus moves to Stage 2. Target is 6 weeks (B_target); the gap between B_min and B_target is filled opportunistically alongside debt repayment.

**Stage 2 — Debt Elimination**
Route surplus to high-cost debt using APR-priority (avalanche) sequencing. Households with lower plan commitment scores receive a blended 70/30 split between the highest-APR debt and the smallest-balance debt, providing behavioural momentum alongside mathematical optimisation. The strategy is user-visible and toggleable on the Debt page.

**Stage 3 — Ownership**
Once the buffer target is met and no debt above the APR threshold remains, surplus flows into index fund investing. The Ownership page shows a 20-year projection using three Vanguard LifeStrategy® fund variants (40%, 60%, 80% equity).

---

## Demo Flow

The recommended adviser walkthrough takes 5–7 minutes:

1. Sign in and open **Dashboard** — review stage badge, monthly surplus, and allocation split (buffer / debt / investment).
2. Open **Resilience** — review current buffer, B_min / B_target progress bar, and "fully funded in X months" projection.
3. Open **Debt** — review the debt stack in APR order, Rail's extra payment routing, and the dual-line projection chart (With Rail vs Minimums Only). Toggle Avalanche / Blended to show behavioural adaptation.
4. Open **Ownership** — review activation month, fund selector, and 20-year projection chart.
5. Use the **What-if planner** in the sidebar to adjust monthly surplus and show how recommendations shift in real time.
6. Open the **Rail Advisor** (bottom-right chat button) — ask a question about the household's plan. The Advisor has live RAE execution data injected into its context.
7. Download the **Plan PDF** from the Dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| Database and auth | Supabase (Postgres + Row Level Security) |
| AI advisor | OpenRouter (multi-model chain: Gemini 2.5 Flash → GPT-4o Mini → Claude Haiku → Llama fallback) |
| Email | Resend |
| Analytics | Posthog |
| PDF generation | @react-pdf/renderer |
| Deployment | Vercel (auto-deploy from `main`) |
| Testing | Jest, ts-jest |

TypeScript strict mode is intentionally disabled for Phase 0A. The project is structurally TypeScript throughout — strict mode will be enabled incrementally when the technical co-founder joins.

---

## Architecture

```
User request
    │
    ▼
app/dashboard/*              ← Server components fetch data, render UI
    │
    ▼
lib/server/rae-recommendation.ts   ← Orchestration layer: loads DB rows,
                                      builds snapshot, calls engine,
                                      writes audit record
    │
    ▼
lib/rae/engine.ts            ← Pure function. No DB. No network.
    │
    ├── surplus.ts           ← S = income − obligations − Σ(minPayments)
    ├── classifier.ts        ← Stage 1 / 2 / 3 classification + B_min / B_target
    ├── allocator.ts         ← Stage-specific allocation + alpha strategy
    ├── shock.ts             ← Income-shock adjustment (phi factor)
    └── projections.ts       ← 60-month forward simulation
```

**Core design principle:** `lib/rae/` is a pure calculation domain. Zero database imports. Zero network calls. It receives a `HouseholdSnapshot` and returns a `RAEResult`. This makes it fully testable in isolation and easy to reason about independently of persistence concerns.

**Separation of layers:**
- `lib/rae/` — domain logic only
- `lib/server/` — orchestration, data mapping, snapshot construction
- `app/api/` — auth gates, request handling, response shaping
- `app/dashboard/` — rendering, client interactivity

---

## Project Structure

```
app/
  api/
    rae/route.ts                  # Recommendation endpoint (GET)
    advisor/route.ts              # AI advisor streaming endpoint (POST)
    plan-pdf/route.ts             # Plan PDF generation (GET)
    session/end/route.ts          # Pre-sign-out snapshot + data purge (POST)
    email/welcome/route.ts        # Welcome email via Resend (POST)
  components/
    AnalyticsProvider.tsx         # Posthog initialisation (client component)
  connect/                        # Bank connection UI (Phase 0B stub)
  dashboard/
    components/
      allocation-chart.tsx        # Donut chart — monthly allocation split
      dashboard-shell.tsx         # Layout shell, What-if planner, mobile nav
      debt-routing-card.tsx       # Debt allocation summary card
      projections-panel.tsx       # 60-month debt + investment chart
      rail-top-bar.tsx            # Pipeline stage stepper
      sidebar.tsx                 # Navigation sidebar with collapse state
    debt/
      debt_page.tsx               # Debt stage server page
      debt_projection_panel.tsx   # Reactive debt table + strategy toggle
    ownership/
      ownership_page.tsx          # Ownership stage server page
    resilience/
      resilience_page.tsx         # Resilience stage server page
    settings/
      page.tsx                    # Settings server route
      settings_page.tsx           # Settings client form
    dashboard_home_page.tsx       # Main dashboard server page
    layout.tsx                    # Dashboard layout + auth guard + top bar
    rae-output-card.tsx           # Main recommendation card (client)
  login/                          # Login page
  onboarding/                     # Household + debt onboarding flow
  signup/                         # Signup page
components/
  advisor/
    AdvisorButton.tsx             # Floating chat button
    AdvisorPanel.tsx              # Streaming AI chat panel
  ownership/
    FundSelector.tsx              # Vanguard LifeStrategy fund picker
    OwnershipClient.tsx           # Ownership projection client component
    ProjectionChart.tsx           # 20-year ownership projection chart
  ui/                             # shadcn/ui primitives
lib/
  analytics.ts                    # Posthog wrapper (no-op without key)
  utils.ts                        # Shared utilities: formatPounds, form parsers, validators
  pdf/
    PlanDocument.tsx              # React-PDF plan document
  rae/
    __tests__/                    # Engine and projection tests
    allocator.ts                  # Stage-specific allocation logic
    classifier.ts                 # Stage classification + B_min / B_target
    engine.ts                     # RAE orchestrator
    projections.ts                # 60-month simulation
    shock.ts                      # Income-shock adjustment
    surplus.ts                    # Surplus calculation
    types.ts                      # Domain types and constants
  server/
    rae-recommendation.ts         # Recommendation orchestration
    scenario.ts                   # What-if surplus delta handling
    snapshot-utils.ts             # DB row → HouseholdSnapshot mapping
    types.ts                      # Canonical server-layer row types
  supabase/
    client.ts                     # Browser Supabase client
    server.ts                     # Server Supabase client (SSR/cookie-aware)
scripts/
  seed.ts                         # Synthetic demo household seed (debug only)
```

---

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project with the required tables, RLS policies, and schema applied

---

## Environment Variables

Create `.env.local` in the project root:

```bash
# Supabase — required at runtime
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenRouter — required for Rail Advisor AI chat
# Load credits at openrouter.ai/settings/credits (minimum ~$10 for paid-tier models)
OPENROUTER_API_KEY=

# Posthog — optional, analytics degrade gracefully without this
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com

# Resend — optional, welcome email is skipped gracefully without this
RESEND_API_KEY=

# Only required for `npm run seed` — never expose client-side
SUPABASE_SERVICE_ROLE_KEY=
```

**Security notes:**
- `SUPABASE_SERVICE_ROLE_KEY` must never be added to Vercel runtime environment variables. It bypasses RLS and is seed-script only.
- `NEXT_PUBLIC_` prefixed variables are embedded in the client bundle at build time. They are safe for public Supabase URLs and keys, and for Posthog keys. Never prefix sensitive secrets with `NEXT_PUBLIC_`.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Routing behaviour:
- `/` redirects to `/dashboard` when authenticated, `/login` when not.
- `/dashboard/*` requires auth; users without a household profile are redirected to `/onboarding`.
- `/onboarding` collects household name, income, obligations, buffer balance, income type, debt stack, and plan commitment score, then writes to Supabase.

---

## Running Tests and Quality Checks

The four-command gate must pass before every push to `main`:

```bash
npm run test && npm run lint && npx tsc --noEmit && npm run build
```

Current test coverage:
- `lib/rae/__tests__/engine.test.ts` — seeded household assertions for Stage 1 and Stage 3 engine output
- `lib/rae/__tests__/projections.test.ts` — 60-month projection bounds for both seed households

---

## API Reference

### `GET /api/rae`

Authenticated. Returns the current recommendation payload.

**Response:**
```json
{
  "result": { /* RAEResult — stage, allocations, shock adjustment, rationale */ },
  "projections": { /* 60-month simulation — debtFreeMonth, interestSaved, monthlySnapshots */ },
  "context": { /* householdName, debts metadata */ },
  "meta": { "auditLogged": true, "profileBootstrapped": false }
}
```

Supports an optional `rail.scenario.surplus_delta` cookie for What-if mode. Scenario runs never write to `rae_executions`.

**Errors:** `401` unauthenticated, `500` internal failure (generic message).

---

### `POST /api/advisor`

Authenticated. Streams an AI response from the Rail Advisor using OpenRouter.

**Request body:**
```json
{
  "householdId": "uuid",
  "messages": [{ "role": "user", "content": "..." }]
}
```

The system prompt is assembled server-side from live household profile, active debt instruments, and the latest `rae_executions` row — giving the model accurate financial context. Falls through a model chain (Gemini 2.5 Flash → GPT-4o Mini → Claude Haiku → Llama free) on rate limit or failure.

**Response:** `text/plain` stream. Header `x-rail-advisor-model` reports which model served the response.

---

### `GET /api/plan-pdf`

Authenticated. Returns a generated PDF plan summary as `application/pdf`.

Runs `buildRaeRecommendation` with `writeAudit: false` (PDF generation never writes audit records).

---

### `POST /api/session/end`

Authenticated. Called immediately before client-side `supabase.auth.signOut()`.

1. Reads household and debt rows for the current user.
2. Writes a snapshot to `session_audit_log` (INSERT only — immutable).
3. Deletes working rows in order: `rae_executions` → `debt_instruments` → `household_profiles`.

**Response:** `{ ok: true }` on success, `{ ok: true, warning: "partial_delete" }` if any delete step fails.

---

### `POST /api/email/welcome`

Unauthenticated internal route. Called fire-and-forget from the signup page after successful `supabase.auth.signUp()`. Sends a welcome email via Resend. Returns `{ ok: true, skipped: true }` gracefully when `RESEND_API_KEY` is absent.

---

## RAE Decision Model

All monetary values are integers in **pence** throughout the engine and database. Division to pounds happens only at the display layer.

### Surplus

```
S = monthlyIncome − fixedObligations − Σ(active debt minimum payments)
```

If S ≤ 0, the household is in obligation stress. No allocation is produced.

### Stage Classification

| Condition | Stage |
|---|---|
| `bufferBalance < B_min` | Stage 1 — Resilience |
| Any active debt APR > 7% | Stage 2 — Debt Elimination |
| Otherwise | Stage 3 — Ownership |

```
B_min    = (weeklyObligations × 3)   where weeklyObligations = totalObligations / 4.33
B_target = (weeklyObligations × 6)
```

### Base Allocation

**Stage 1:** Full surplus fills the buffer gap to B_min. Any remaining surplus targets the highest-APR debt.

**Stage 2:** Allocation strategy is determined by `planCommitmentScore` via `computeAlpha()`:
- Score ≥ 0.6 → `alpha = 1.0` → pure avalanche (100% to highest-APR debt)
- Score < 0.6 → `alpha = 0.7` → blended 70/30 (highest-APR debt + smallest-balance debt)

**Stage 3:** Remaining buffer gap (B_min to B_target) is filled opportunistically; surplus flows to investment.

### Shock Adjustment

When `incomeShockProbability > shockThreshold (0.25)`, a phi factor redirects a portion of debt or investment allocation back to the buffer:

```
phi = max(0, (pShock − threshold) / (1 − threshold))
redirectAmount = min(pool × 0.5, pool × phi)
```

`incomeShockProbability` is derived from `income_volatility / monthlyIncome × 2`. The income volatility input is collected during onboarding and settings as a three-option selector (Stable / Variable / Highly variable), mapping to 0%, 20%, and 40% of monthly income respectively.

### Interest Accrual Model

Projections use the standard consumer credit model: interest accrues on the opening balance before the payment is applied.

```
interestAccrued = round(openingBalance × apr/12)
nextBalance = round(max(0, openingBalance + interestAccrued − payment))
```

---

## Key Engineering Decisions

**`lib/rae/` is zero-dependency pure functions.** No database imports. No network calls. This is enforced by `.cursorrules` and makes the engine independently testable and auditable. The `rae_executions` table provides an immutable FCA Consumer Duty audit trail of every execution.

**All monetary values are pence integers.** `£2,800` is stored and computed as `280000`. Floats are never used for money. Division to pounds happens only at the display layer via `formatPounds()` in `lib/utils.ts`.

**`rae_executions` is INSERT-only.** This table is an append-only audit log. No DELETE or UPDATE policy exists. Scenario (What-if) runs are explicitly excluded from audit writes.

**`SUPABASE_SERVICE_ROLE_KEY` is never in Vercel runtime.** The application runs exclusively on the anon key under RLS. Service role is seed-script only.

**Server components by default.** `"use client"` is only added when browser APIs, user interaction state, or React hooks are required. Data fetching always happens server-side.

**One shared utility source.** `lib/utils.ts` is the canonical home for `formatPounds`, `poundsStringToPence`, `aprStringToDecimal`, `isPositiveNumber`, and `isNonNegativeNumber`. `lib/server/types.ts` is the canonical home for `HouseholdRow`, `DebtRow`, and `LatestExecutionRow`.

---

## Database Tables

| Table | Purpose |
|---|---|
| `household_profiles` | One row per user. Income, obligations, buffer, volatility, commitment score. |
| `debt_instruments` | One row per debt. Balance, APR, minimum payment, type, active flag. |
| `rae_executions` | Immutable audit log. One row per RAE execution. INSERT only. |
| `session_audit_log` | Snapshot written on sign-out. INSERT only. Never deleted. |

RLS policies scope every table to `auth.uid()`. No row is readable or writable without a valid authenticated session, except `session_audit_log` which is INSERT-only even for the owning user.

---

## Security

- All server routes validate the authenticated user via `supabase.auth.getUser()` before accessing data. `getSession()` is never used for auth gating (it trusts the client).
- The anon key is the only Supabase key used at runtime. Service role is never present in Vercel environment variables.
- `rae_executions` has no DELETE policy — rows cannot be removed by any client or server path.
- Truelayer tokens (Phase 0B) must never be stored in plaintext in any Supabase column.
- All secrets live in `.env.local`. Nothing is hardcoded.
- The `"use client"` boundary is minimised — data never flows through client components to the database directly, with the exception of the onboarding and settings forms which write household data using the anon key under RLS.

---

## Known Limitations and Phase 0B Roadmap

**Current prototype limitations:**
- Income and financial data are self-reported via onboarding. There is no live bank connection yet.
- The `/connect` page (bank picker UI) is a visual stub — Truelayer OAuth is Phase 0B.
- `income_volatility` is a manual input approximation, not derived from transaction history.
- The projection horizon is fixed at 60 months.
- No schema migration files exist in the repository — the schema must be applied directly in Supabase.
- TypeScript strict mode is disabled.

**Phase 0B roadmap:**
- Truelayer open banking integration — OAuth handshake, token handling, transaction fetch, categorisation pipeline mapping transactions to `fixedObligations` and `monthlyIncome`
- Supabase-generated typed client replacing manual row type declarations in `lib/server/types.ts`
- Projection snapshots — periodic capture of `rae_executions` output for trend views
- Schema migration versioning inside the repository
- Expanded test coverage for API and integration boundaries
- Strict mode TypeScript migration

---

## Contributing

1. Create a feature branch from `main`.
2. Keep `lib/rae/` pure — zero database or network imports. This is non-negotiable.
3. All monetary values are integers in pence. Never introduce float money arithmetic.
4. Add or update tests for any behavioural change to the engine or projections.
5. Run the full gate before opening a PR:

```bash
npm run test && npm run lint && npx tsc --noEmit && npm run build
```

6. Read `.cursorrules` in the project root before writing any code. It is the authoritative guide to architectural decisions, conventions, and constraints.

---

## License

No license file is currently defined in this repository. If you intend to distribute this software, add an explicit `LICENSE` file.
