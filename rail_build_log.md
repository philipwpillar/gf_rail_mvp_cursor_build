# Rail Prototype — Build Log

## 2026-04-08 — Phase 1 to Phase 5 modernization (user-owned data + lifecycle + PDF updates)

### Phase 1 — Database and RLS alignment (Supabase SQL)
- Removed synthetic household data from working tables.
- Added `session_audit_log` table for INSERT-oriented session-end snapshots:
  - `user_id`, `email`, `session_end_at`, `household_snapshot`, `debts_snapshot`, `rae_execution_count`.
- Enabled/verified RLS coverage for:
  - `household_profiles`
  - `debt_instruments`
  - `rae_executions`
  - `session_audit_log`
- Added DELETE policies required for controlled sign-out purge:
  - own `household_profiles` row
  - own `debt_instruments` rows via household ownership
  - own `rae_executions` rows via household ownership
- Confirmed `session_audit_log` remains non-deletable via policy (SELECT/INSERT only).

### Phase 2 — Onboarding flow guardrails
- Fixed onboarding completion navigation:
  - `app/onboarding/onboarding_page.tsx` now redirects to `/dashboard` (not `/connect`).
- Added dashboard entry guard in layout:
  - `app/dashboard/layout.tsx` redirects users with no household profile to `/onboarding`
  - prevents empty-profile dashboard rendering and downstream blank bootstrap behavior in UI flow.

### Phase 4 — Sign-out data lifecycle
- Added `app/api/session/end/route.ts`:
  - Auth check (`supabase.auth.getUser()`).
  - Snapshot household/debts/RAE execution count into `session_audit_log`.
  - Delete working rows in order: `rae_executions` -> `debt_instruments` -> `household_profiles`.
  - Delete and audit insert failures are logged; route returns success with warning on partial delete.
- Updated `app/dashboard/components/sidebar.tsx` sign-out sequence:
  - Calls `POST /api/session/end` before `supabase.auth.signOut()`.
  - Added non-blocking fallback if API call fails.
  - Added `isSigningOut` loading state and disabled button while processing.

### Phase 5 — PDF ownership projection correction
- Updated `lib/pdf/PlanDocument.tsx`:
  - Added in-document future value helper (`7%` nominal annual assumption, monthly compounding).
  - Replaced month-60 investment snapshot row with:
    - projected investment value at 10 years
    - projected investment value at 20 years
  - Renamed section title to `Ownership Projection`.
  - Added sub-label: "Assumes 7% nominal annual growth. For illustration only."

### Resulting product profile (current)
- User-owned onboarding data flow is now primary (no seeded-household dependency in core UX).
- Dashboard access is guarded by real household presence.
- Sign-out captures an auditable snapshot and purges working financial rows.
- PDF ownership section now matches product spec for 10-year and 20-year projections.

## 2026-03-28 — Vercel production deployment (Hobby)

### Deployment details
- **Platform**: Vercel (Hobby plan).
- **Live URL**: [https://gf-rail-mvp-cursor-build.vercel.app](https://gf-rail-mvp-cursor-build.vercel.app)
- **Source**: GitHub repo `philipwpillar/gf_rail_mvp_cursor_build`, `main` branch.
- **Auto-deploy**: Active — every push to `main` triggers a new production deployment automatically.

### Vercel environment variables (Production)
Configured in the Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Supabase Auth configuration
Updated for production hosting:
- **Site URL**: `https://gf-rail-mvp-cursor-build.vercel.app`
- **Redirect URLs**: Include `https://gf-rail-mvp-cursor-build.vercel.app/**`

### Status
- Build passes cleanly on Vercel.
- Login page renders correctly at the live URL.
- Post-deploy smoke test in progress.

## 2026-03-27 — Session 3 stage page implementation + routing cleanup

### What shipped (repo state)
- Implemented full stage pages with live Supabase-backed content:
  - `app/dashboard/resilience/resilience_page.tsx`
  - `app/dashboard/debt/debt_page.tsx`
  - `app/dashboard/ownership/ownership_page.tsx`
- Added route-wrapper pattern for unique module naming while preserving App Router conventions:
  - `page.tsx` files now delegate to uniquely named `*_page.tsx` implementations.
- Added shared dashboard shell component:
  - `app/dashboard/components/dashboard-shell.tsx`
  - Sidebar collapse behavior moved to shell-level so all `/dashboard/*` pages share one layout frame.
- Added shared snapshot utility for mapping household/debt rows to `HouseholdSnapshot`:
  - `lib/server/snapshot-utils.ts`
  - Reduced duplicate mapping logic across recommendation and stage pages.
- Added shadcn foundation artifacts copied from scaffold repo (no overwrite):
  - `components.json`
  - `components/ui/button.tsx`
  - `components/theme-provider.tsx`
  - `lib/utils.ts`
  - Installed required supporting dependencies in `package.json`.

### Route and data hotfixes
- Fixed Next.js route config export issue:
  - Route wrappers now export `dynamic` directly and only re-export `default`.
- Restored per-user household scoping on stage pages:
  - Re-added `getUser()` + `.eq("user_id", user.id)` in stage page data queries.

### Validation
- `npm run lint` passes.
- `npm run test` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes.

## 2026-03-27 — Session 2 IA realignment (Option A route scaffolding)

### What shipped (repo state)
- Realigned sidebar information architecture to stage-based navigation:
  - `Dashboard` (`/dashboard`)
  - `Resilience` (`/dashboard/resilience`)
  - `Debt` (`/dashboard/debt`)
  - `Ownership` (`/dashboard/ownership`)
- Added route-aware active highlighting in `app/dashboard/components/sidebar.tsx` using `usePathname()`.
- Kept collapsible sidebar behavior and household footer display.
- Added sidebar sign-out action via Supabase browser client and router redirect to `/login`.
- Added skeleton route pages:
  - `app/dashboard/resilience/page.tsx`
  - `app/dashboard/debt/page.tsx`
  - `app/dashboard/ownership/page.tsx`
- Removed non-spec sidebar item (`Execution Log`) from the stage-based Option A nav.

### Scope note
- This session intentionally delivers route integrity and IA alignment first.
- Deep page content (Supabase-backed cards and projections per stage page) is a follow-on pass.

## 2026-03-26 — Stage 7 dashboard UI build (scenario workspace + collapsible sidebar)

### What shipped (repo state)
- Upgraded `app/dashboard/rae-output-card.tsx` from a basic output card into a full dashboard workspace:
  - Left "fake sidebar" navigation in a single-page layout.
  - Scenario header with stage badge and tab strip.
  - KPI row for surplus, current buffer floor (`B_min`), and target buffer (`B_target`).
  - Allocation plan card showing buffer/debt/investment monthly contributions.
  - Risk and rationale card from `runRAE` output.
- Added charting via `recharts`:
  - Donut visualization of final allocation mix (buffer/debt/investment).
- Added collapsible sidebar behavior:
  - Expanded/collapsed widths on desktop.
  - Icon-only collapsed mode.
  - User preference persisted in `localStorage`.
- Enriched `/api/rae` response context consumed by dashboard UI:
  - Household display name.
  - Debt metadata for rendering debt routing labels and APR.

### User experience intent
- Mirrors a professional planning workspace structure suitable for investor-demo flows.
- Keeps language in Rail domain terms (Allocation Plan, Cash Flow View, Historical Trends, Stress Test).
- Keeps light-mode simplicity for current alpha phase.

### Architecture constraints preserved
- RAE core (`lib/rae/*`) remains pure and side-effect free.
- Dashboard reads all recommendation data through `/api/rae`.
- No database or network access was introduced into engine modules.

### Validation
- `npm run lint` passes.
- `npm run test` passes.
- `npx tsc --noEmit` passes.

## 2026-03-26 — Stage 7 integration hardening (audit resilience + profile bootstrap + server preload)

### What shipped (repo state)
- Added `lib/server/rae-recommendation.ts` to centralize recommendation integration logic:
  - Ensures household profile exists (auto-bootstraps first-time users).
  - Loads debt instruments and constructs engine snapshot.
  - Executes pure `runRAE(snapshot)`.
  - Attempts `rae_executions` audit insert without hard-failing user experience.
- Updated API route (`app/api/rae/route.ts`):
  - Uses shared server recommendation builder.
  - Returns client-safe generic error on internal failures.
- Updated dashboard preload flow (`app/dashboard/page.tsx` + `app/dashboard/rae-output-card.tsx`):
  - Recommendation is preloaded server-side.
  - Removed client-side fetch/loading flash for the main recommendation payload.
  - Added a visible onboarding cue when a household profile is bootstrapped automatically.

### Why this matters
- New signups no longer hit a dead-end 404 when no profile row exists.
- Audit insertion problems are observable in server logs without blanking the dashboard.
- Investor-demo flow is smoother with immediate first paint of recommendation content.

### Validation
- `npm run lint` passes.
- `npm run test` passes.
- `npx tsc --noEmit` passes.

## 2026-03-26 — Stage 6 wiring (dashboard -> API -> pure RAE engine)

### What shipped (repo state)
- Added `app/api/rae/route.ts` as the first server-side execution boundary for RAE:
  - Authenticates via `supabase.auth.getUser()`.
  - Loads the caller's `household_profiles` row by `user_id`.
  - Loads matching `debt_instruments` by `household_id`.
  - Maps database fields into a `HouseholdSnapshot` for the engine.
  - Runs `runRAE(snapshot)` and returns JSON `{ result }`.
- Added `app/dashboard/rae-output-card.tsx`:
  - Client-side card that calls `GET /api/rae` on mount.
  - Shows loading, error, and initial recommendation values.
  - Displays stage, surplus, B_min/B_target, and final allocation buckets.
- Updated `app/dashboard/page.tsx`:
  - Imports and renders `RaeOutputCard`.
  - Updated copy to reflect live Stage 6 API wiring.

### Architecture constraints preserved
- `lib/rae/*` remains pure and side-effect free (no database/network access in engine path).
- Database reads are contained to the API route layer (`app/api/rae/route.ts`).
- Dashboard UI now consumes RAE output through the API boundary, not through direct data + engine coupling.

### Stage 6 assumptions and TODOs
- `incomeShockProbability` is currently set to `0` in API mapping for deterministic baseline output.
- Added TODO in route to calibrate `pShock` from volatility/history in a later stage.

### Validation
- `npm run lint` passes.
- `npm run test` passes (RAE seeded-household tests).
- `npx tsc --noEmit` passes.

## 2026-03-26 — Stage 5 test harness (Jest + seeded engine tests)

### What shipped (repo state)
- Added `jest.config.ts` with `ts-jest` preset and Node test environment.
- Added module alias mapping for `@/` paths (`^@/(.*)$` -> `<rootDir>/$1`).
- Added `lib/rae/__tests__/engine.test.ts`:
  - Sarah & James seeded scenario assertions (Stage 1 expected behavior).
  - Mark & Lisa seeded scenario assertions (Stage 3 expected behavior).
- Added `test` script to `package.json`.
- Aligned Jest toolchain versions for compatibility:
  - `jest` 29.x
  - `ts-jest` 29.x
  - `@types/jest` 29.x

### Validation
- `npm run test` passes (2/2 tests).
- `npm run lint` passes.
- `npx tsc --noEmit` passes.

## 2026-03-25 to 2026-03-26 — Stage 4 integration (shock + engine + cleanup)

### What shipped (repo state)
- Added `lib/rae/shock.ts`:
  - Shock factor calculation (`phi`).
  - Stage-aware reallocation logic.
  - Debt/investment redirection caps and reconciliation.
- Added `lib/rae/engine.ts`:
  - Orchestrates surplus -> classification -> base allocation -> shock adjustment.
  - Returns full `RAEResult` contract including rationale text.
  - Handles obligation-stress path with zero allocations.
- Cleanup pass applied:
  - Deduplicated `zeroAllocation()` by exporting from allocator and reusing in engine.
  - Removed redundant allocator re-export noise.
  - Added TODO marker for planned `incomeVolatility` integration in shock calibration.

### Validation
- Engine scenarios validated via subsequent Stage 5 tests.
- Lint and typecheck passed after cleanup pass.

## 2026-03-25 — Stage 3 decision layer (classification + allocation)

### What shipped (repo state)
- Added `lib/rae/classifier.ts`:
  - Computes `B_min` and `B_target` from weekly obligations.
  - Applies stage rules:
    - Buffer below `B_min` -> Stage 1
    - Else high-APR active debt -> Stage 2
    - Else -> Stage 3
- Added `lib/rae/allocator.ts`:
  - Stage-specific base allocation logic.
  - Alpha strategy (pure avalanche vs blended 70/30 split).
  - Explicit pence rounding with reconciliation to exact surplus totals.

### Validation
- Allocation behavior validated through Stage 5 seeded tests.
- Rounding invariant maintained in allocator.

## 2026-03-25 — Stage 2 engine foundation (types + surplus)

### What shipped (repo state)
- Added `lib/rae/types.ts`:
  - RAE domain types (`HouseholdSnapshot`, `AllocationVector`, `RAEResult`, etc.).
  - Pipeline stage enum and default config constants.
- Added `lib/rae/surplus.ts`:
  - Computes discretionary surplus:
    - `monthlyIncome - fixedObligations - sum(active debt minimums)`.
  - Flags obligation stress when surplus is `<= 0`.

### Validation
- Formula and contracts integrated cleanly with later Stage 3/4 modules.

## 2026-03-25 — Stage 1 foundation (scaffold + Supabase + seed + RLS sanity)

### What shipped (repo state)
- **Next.js scaffold**: `rail-prototype/` created with App Router + Tailwind + TypeScript.
- **TypeScript Phase 0A config**: `tsconfig.json` updated to **`strict: false`**; kept `noImplicitReturns` + `noFallthroughCasesInSwitch`; reduced unused-noise settings.
- **Dependencies installed**:
  - **Supabase**: `@supabase/supabase-js`, `@supabase/ssr` (modern App Router SSR pattern).
  - **Future dashboard deps**: `recharts`, `posthog-js`, `resend`.
  - **Testing deps installed early**: `jest`, `ts-jest`, `@types/jest`, `@testing-library/react`, `@testing-library/jest-dom`.
  - **Seeding tooling**: `tsx`, `dotenv`.
- **Env handling**:
  - Added `.env.example` (committable template).
  - Added `.env.local` (local secrets; gitignored via `.env*`).
- **Supabase client split (SSR vs browser)**:
  - `lib/supabase/server.ts`: server client using anon key + cookies.
  - `lib/supabase/client.ts`: browser client using anon key.
  - **Service role key is not used in app runtime code** (seed only).
- **Auth + routing skeleton**:
  - `app/login/page.tsx` and `app/signup/page.tsx` created (basic email/password flows).
  - Server-side auth gates:
    - `app/page.tsx`: redirects to `/dashboard` when logged in else `/login`.
    - `app/dashboard/page.tsx`: redirects to `/login` when logged out.
  - **Security fix**: server gates use `supabase.auth.getUser()` (validated) rather than `getSession()`.
  - `/` and `/dashboard` marked `dynamic = "force-dynamic"` to avoid prerender issues in early setup.

### Supabase database (migration + policy decision)
- Ran the Phase 0A migration script from `context-documents/rail_database_schema.md`, **with one critical RLS patch applied**:
  - `rae_executions` is an immutable audit log → **no DELETE policy**.
  - Replaced `for all` policy with explicit `select`/`insert`/`update` policies so deletes are denied by default under RLS.
- Notes recorded:
  - No `updated_at` trigger (acceptable Phase 0A; consider Phase 0B).

### Seed data (synthetic demo households)
- Added `scripts/seed.ts` and `npm run seed`.
- Seed script uses **service role key** to:
  - Create two auth users (email-confirmed).
  - Insert two `household_profiles` rows (`is_synthetic = true`).
  - Insert matching `debt_instruments` rows.
- Seeded households match `rail_database_schema.md` exactly (pence-perfect):
  - **Sarah & James** (Stage 1 example): income 280,000p; fixed obligations 225,500p; buffer 90,000p; 3 debts (Card A/B + Loan).
  - **Mark & Lisa** (Stage 3 example): income 320,000p; fixed obligations 250,000p; buffer 346,000p; 1 debt (Car Loan).
- Synthetic auth user credentials (Supabase Auth — not for real use):
  - `sarah.james+synthetic@rail-prototype.local` / `RailPrototype!234`
  - `mark.lisa+synthetic@rail-prototype.local` / `RailPrototype!234`

### Mandatory RLS + cookie propagation sanity check
- Updated `app/dashboard/page.tsx` to query `household_profiles.display_name` where `user_id = logged-in user.id` using the **server client** (anon key + cookies).
- Renders display_name visibly with clear error/empty states to confirm:
  - RLS policies are correct
  - session cookie is propagating

### Dev server stability
- Encountered a Turbopack panic during dev; switched dev to webpack:
  - `package.json` → `"dev": "next dev --webpack"`

### GitHub backup
- Connected `rail-prototype/` repo to GitHub remote and pushed `main`.
- Added `context-documents/` to `.gitignore` to avoid pushing confidential docs.

### How to demo right now
- `npm run dev`
- Visit `/login`
- Seeded demo logins:
  - `sarah.james+synthetic@rail-prototype.local` / `RailPrototype!234`
  - `mark.lisa+synthetic@rail-prototype.local` / `RailPrototype!234`
- After login, `/dashboard` should show **Sanity check → Household: <display_name>**.

### Next steps
1. Confirm `/dashboard` shows the correct household display name for the logged-in user.
2. Commit + push Stage 1 work (confirm `.env.local` is ignored before committing).
3. Start **Stage 2** (in separate sessions):
   - Create `lib/rae/types.ts` (foundation types/constants)
   - Create `lib/rae/surplus.ts` (compute \(S = I − O − Σ minPayments\))

### Known debt to address before investor demo (Stage 7)
- `app/login/page.tsx` and `app/signup/page.tsx` currently use plain HTML inputs/buttons; migrate to shadcn/ui components during Stage 7 UI work.

