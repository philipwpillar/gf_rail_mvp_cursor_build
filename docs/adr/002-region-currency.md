# ADR 002 — Region and Currency Structural Support

**Date:** 2026-04-21
**Status:** Accepted
**Decider:** Philip Pillar

## Context

The Rail MVP hardcoded GBP (£) throughout: in template literals, formatter
functions, the advisor context JSON, the AI system prompt, and the PDF
export. The Originator Rail thesis requires the platform to support at
minimum GB (GBP) and US (USD) as first-class regions. The Originator
Implementation Specification (§4.2) identifies this as a Tier 1 change.

## Decision

1. Add `region` (default 'GB') and `currency` (default 'GBP') columns to
   `household_profiles` and `tenants`.
2. Add `currency` and `region` as optional fields on `HouseholdSnapshot`
   (optional for backward compatibility with existing tests).
3. Create `lib/display/money.ts` as the single canonical formatter:
   `formatMoney(pence, currency)` and `getCurrencySymbol(currency)`.
4. Update `lib/utils.ts:formatPounds` to delegate to `formatMoney(pence, 'GBP')`.
   All ~20 existing callers continue to work with zero changes.
5. Update all raw `£` template literals in components and charts to call
   `formatMoney(value, 'GBP')` with a `// TODO: thread currency prop` comment.
6. Update `lib/rae/engine.ts` private formatter to use `snapshot.currency`.
   The engine stays self-contained with no new imports (lib/rae/ purity rule).
7. Add a US synthetic seed household (Alex & Morgan) to validate the pattern.

## Form label deferral

Static `£` symbols in form labels (`onboarding_page.tsx`,
`settings_page.tsx`, `dashboard-shell.tsx` scenario slider) are NOT
updated in this session. These are input labels, not monetary output
formatters, and threading a currency prop into these client components
adds complexity without user-visible benefit for single-region operation.
These are tagged with TODOs and deferred to the session that introduces
live multi-tenant routing.

## Consequences

- The data layer is structurally multi-currency from this session onwards
- `formatMoney(pence, currency)` is the canonical formatter for all new code
- `formatPounds(pence)` remains as a convenience wrapper for existing call sites
- The US seed household (Alex & Morgan) validates USD rendering end-to-end
- Phase 1 work to make components fully currency-dynamic requires only:
  threading the `currency` prop from household context to components and
  replacing `formatMoney(value, 'GBP')` with `formatMoney(value, currency)`

## Alternatives considered

**Replace all formatPounds calls immediately:** 20+ call sites across
dashboard pages, PDFs, and components. High effort, no user-visible
benefit at single-region stage. Deferred — the delegation wrapper pattern
achieves the same structural outcome.

**Store currency on HouseholdSnapshot as required:** Would break all
existing tests that construct snapshots without the currency field.
Made optional with GBP default — structurally present, backward compatible.
