# Rail Prototype — Build Log

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

