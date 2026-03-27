# Rail Prototype

Rail Prototype is a household financial-planning web application built with Next.js and Supabase.
It generates stage-based monthly allocation recommendations using the Rail Allocation Engine (RAE), then presents projections for resilience, debt payoff, and long-term ownership/investing outcomes.

## Table of Contents

- [Non-Technical Overview](#non-technical-overview)
- [What This App Does](#what-this-app-does)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Quick Start](#quick-start)
- [Seed Data (Optional)](#seed-data-optional)
- [Running Tests and Quality Checks](#running-tests-and-quality-checks)
- [API](#api)
- [RAE Decision Model](#rae-decision-model)
- [Data Requirements](#data-requirements)
- [Security and Privacy Notes](#security-and-privacy-notes)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Non-Technical Overview

### Problem

Many households do not struggle because they lack income, but because monthly surplus is not routed in a stable order.
Without a clear system, money gets split reactively across emergency savings, debts, and investing, which slows progress and increases stress.

### What Rail Solves

Rail provides a simple operating system for household cash flow:

- build a safe emergency buffer first,
- eliminate expensive debt with disciplined routing,
- then transition to long-term ownership/investing.

Instead of generic budgeting tips, Rail gives a concrete, stage-based monthly allocation plan that adapts to household risk.

### How It Works in Practice

For each signed-in household, Rail:

1. Reads current income, obligations, debts, and buffer position.
2. Identifies the current stage (Resilience, Debt, or Ownership).
3. Computes exactly how this month’s surplus should be allocated.
4. Shows projected outcomes (debt-free timing, interest impact, and ownership growth path).

### Why This Matters

- **Clarity:** one recommended plan each month, not many conflicting choices.
- **Behavioral momentum:** users can see progress by stage and understand "what to do next."
- **Risk awareness:** elevated income-shock risk triggers more protective allocations.
- **Explainability:** recommendations include plain-language rationale, not black-box scores.

### Fast Demo Flow (5-7 minutes)

1. Sign in (or create account) and open `Dashboard`.
2. Review stage badge and monthly allocation split (buffer/debt/investment).
3. Open `Resilience` to see current safety-net coverage and buffer progress.
4. Open `Debt` to see payoff order, routing, and projected debt-free month.
5. Open `Ownership` to show when surplus transitions into long-term asset building.

## What This App Does

Rail helps a household decide how to allocate monthly surplus across:

- emergency buffer building (resilience),
- debt paydown (priority routing),
- ownership/investing.

The app:

1. Authenticates users through Supabase Auth.
2. Reads household and debt inputs from Supabase.
3. Runs a pure financial decision engine (`runRAE`) on the server.
4. Stores an execution audit record (`rae_executions`) for observability and history.
5. Renders a dashboard with recommendation outputs and forward projections.

## Core Features

- Email/password signup and login flows.
- Server-side auth gating and protected dashboard routes.
- Stage-aware recommendation engine (Resilience -> Debt -> Ownership).
- Shock-aware allocation adjustment for elevated income-shock risk.
- Debt routing with APR-priority behavior.
- Projection simulation (up to 60 months) including debt-free month and interest savings estimate.
- Dashboard IA split into dedicated pages:
  - `Dashboard`
  - `Resilience`
  - `Debt`
  - `Ownership`
- Sidebar collapse state persisted across sessions.
- Optional seed script for repeatable demo households.

## Tech Stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling/UI:** Tailwind CSS, Recharts
- **Backend/Data/Auth:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Testing:** Jest, ts-jest
- **Tooling:** ESLint, tsx, dotenv

## Architecture

- **UI Layer (`app/*`):**
  - App Router pages and components for auth + dashboard views.
- **API Layer (`app/api/rae/route.ts`):**
  - Authenticates current user, builds recommendation payload, returns JSON.
- **Integration Layer (`lib/server/*`):**
  - Data mapping, snapshot construction, recommendation orchestration, audit writing.
- **Domain Engine (`lib/rae/*`):**
  - Pure calculation modules for surplus, classification, allocation, shock adjustments, and projections.
  - No database/network side effects.

Design principle: pure engine logic is isolated from persistence and request concerns.

## Project Structure

```text
app/
  api/rae/route.ts                 # Recommendation API endpoint
  dashboard/                       # Dashboard and stage pages
  login/                           # Login route and page
  signup/                          # Signup route and page
lib/
  rae/                             # Pure decision engine + tests
  server/                          # Server-side orchestration/data mapping
  supabase/                        # Browser/server Supabase client factories
scripts/
  seed.ts                          # Optional synthetic demo seed
```

## Prerequisites

- Node.js 20+ recommended
- npm 10+ recommended
- A Supabase project with the required tables and policies

## Environment Variables

Create `rail-prototype/.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # required only for `npm run seed`
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required at runtime.
- `SUPABASE_SERVICE_ROLE_KEY` is only needed for seeding and should never be exposed client-side.

## Quick Start

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Routing behavior:

- `/` redirects to `/dashboard` when authenticated.
- `/` redirects to `/login` when unauthenticated.
- `/dashboard/*` is protected and requires auth.

## Seed Data (Optional)

To load synthetic demo users/households/debts:

```bash
npm run seed
```

The seed script is idempotent for existing users/profiles with matching identifiers and labels.

## Running Tests and Quality Checks

```bash
npm run test
npm run lint
npx tsc --noEmit
npm run build
```

## API

### `GET /api/rae`

Authenticated endpoint that returns a recommendation payload:

- `result` (RAE output contract)
- `projections` (60-month forward simulation)
- `context` (household/debt metadata for rendering)
- `meta`:
  - `auditLogged`
  - `profileBootstrapped`

Errors:

- `401` when user is unauthenticated.
- `500` for internal failures (generic message returned to client).

## RAE Decision Model

The engine executes this high-level flow:

1. **Surplus calculation**
   - `monthlyIncome - fixedObligations - sum(activeDebtMinimums)`
2. **Stage classification**
   - Stage 1: Build safety net until minimum buffer floor
   - Stage 2: Eliminate prioritized debt
   - Stage 3: Build ownership/investment
3. **Base allocation**
   - Distributes surplus by stage and plan commitment profile
4. **Shock adjustment**
   - Reallocates to buffer protection when income-shock risk is elevated
5. **Rationale generation**
   - Produces user-facing explanation text for current allocation

All monetary values are represented in **pence** (integers).

## Data Requirements

The app expects the following core Supabase tables:

- `household_profiles`
- `debt_instruments`
- `rae_executions`

Runtime assumptions:

- Authenticated users are linked to one `household_profiles` row by `user_id`.
- Debt rows are linked to households by `household_id`.
- RLS policies permit users to read/write only their own records where applicable.

## Security and Privacy Notes

- Uses Supabase Auth sessions for user identity.
- Server-side recommendation route validates the authenticated user before data access.
- Service role key is used by seed tooling only and should remain server-local.
- Audit logging failures do not hard-fail recommendation rendering; they are logged server-side.

## Known Limitations

- Prototype-stage product and schema assumptions; not production hardened.
- No formal migrations/docs in this repo for schema bootstrap (must be applied in Supabase).
- Forecasting/projection assumptions are intentionally simplified for Phase 0.
- Historical execution analytics views are limited in current UI.

## Roadmap

Planned/likely next improvements:

- richer stress-testing and scenario comparison views,
- stronger schema/migration versioning inside repo,
- expanded test coverage for API and integration boundaries,
- improved ownership projection and explanatory modeling.

## Troubleshooting

- **Missing env vars error:** ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist in `.env.local`.
- **Unauthorized on dashboard/API:** sign in first and confirm Supabase auth cookie/session is active.
- **No recommendation data:** verify household/debt rows exist for the user (or run seed for demo data).
- **Seed script fails:** confirm `SUPABASE_SERVICE_ROLE_KEY` is set and has admin privileges.

## Contributing

For local changes:

1. Create a feature branch.
2. Keep domain logic in `lib/rae/*` pure (no DB/network side effects).
3. Add/update tests for behavioral changes.
4. Run lint, tests, typecheck, and build before opening a PR.

## License

No license file is currently defined in this repository.
If you intend to distribute this software, add an explicit `LICENSE` file (for example MIT, Apache-2.0, or proprietary terms).
