# ADR 006 - Credit Graduation Log and One-and-Done Rule

**Date:** 2026-04-21
**Status:** Accepted
**Decider:** Philip Pillar

## Context

The Originator Rail thesis depends on a structural guarantee: once a
household completes the Debt Elimination stage, Rail never returns them
to credit. This "one-and-done" rule is what distinguishes Rail from a
debt management app. Without structural enforcement, the rule is
aspirational documentation that could be violated by a UI change, a
data update, or a future developer unfamiliar with the intent.

The Originator Implementation Specification (§4.6) identifies the credit
graduation log as a Tier 1 change: the primitive must be structural before
the credit product (Rail Accelerator Loan) is built.

## Decision

1. Add `has_graduated_from_credit BOOLEAN DEFAULT false` to
   `household_profiles`.
2. Create `credit_graduation_events` as an INSERT-only append log. One
   row per graduation event: `household_id`, `tenant_id`,
   `final_debt_balance_pence`, `engine_version`, `policy_version`.
3. Add a graduation guard in `lib/server/rae-recommendation.ts`:
   after `runRAE`, if `household.has_graduated_from_credit = true`,
   override the result stage to `STAGE_3_OWNERSHIP` regardless of what
   the engine computed. This is post-processing at the server layer -
   `lib/rae/` functions remain pure.

## Why server layer, not engine layer

The graduation flag is a database-persisted state. The lib/rae/ purity
rule prohibits database or network access in engine functions. The guard
correctly lives at the server integration layer where DB state is already
loaded.

## What triggers graduation

The graduation flag (`has_graduated_from_credit = true`) is set by a
future explicit action - e.g. when the user confirms their final debt
payment, or when the engine detects zero active high-APR debt for N
consecutive months. The infrastructure is in place in this session; the
trigger mechanism is Phase 1 scope.

## Consequences

- The one-and-done rule is structural from this session forwards
- Graduated households always see STAGE_3 regardless of new debt entries
- `credit_graduation_events` is the audit record of each graduation
- The Series A credit product (Rail Accelerator Loan) can check
  `has_graduated_from_credit` before any loan origination decision
- DELETE is denied by RLS on `credit_graduation_events` - the record
  is permanent

## Alternatives considered

**Enforce in UI only:** Relies on UI code never regressing. Rejected -
the thesis requires structural enforcement.

**Enforce in RLS:** Would require a DB function checking graduation status
during stage classification queries. Too complex and the wrong layer.
The server integration layer is correct.
