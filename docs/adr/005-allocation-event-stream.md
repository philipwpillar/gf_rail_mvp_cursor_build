# ADR 005 — Allocation Decision Event Stream

**Date:** 2026-04-21
**Status:** Accepted
**Decider:** Philip Pillar

## Context

The Rail Allocation Engine produces allocation decisions on every execution
but those decisions existed only transiently — in the `rae_executions` row
and in the API response. No queryable, longitudinal record of allocation
outcomes existed. The Originator Implementation Specification (§4.3)
identifies the allocation decision event stream as a Tier 1 change: every
day the table doesn't exist is longitudinal data lost forever. The data
moat starts accruing from the session this table is created.

## Decision

Create `allocation_decisions` as an append-only event log. One row is
written per non-zero allocation bucket per baseline RAE execution:

- `BUFFER` — the final buffer contribution in pence
- `DEBT` — the total final debt allocation in pence (sum of all instruments)
- `INVESTMENT` — the final investment contribution in pence

Zero-amount buckets are not written. Obligation-stress executions produce
zero rows (the stress flag is already on the `rae_executions` row).

Each row carries `tenant_id`, `household_id`, `rae_execution_id`,
`engine_version`, `policy_version`, `request_id`, and `created_at` — the
fields needed for longitudinal analytics and regulatory audit.

RLS mirrors `rae_executions`: INSERT and SELECT allowed; no UPDATE or
DELETE policy means those operations are denied. The table is immutable.

The write path is non-blocking: insert failures are logged but never
propagate to the calling request. A failed `allocation_decisions` insert
does not affect `rae_executions` or the API response.

The write path is gated by the same compliance guard as `rae_executions`
(`shouldWriteAudit && surplusDeltaPence === 0`) — scenario runs do not
write to the event stream.

## What is not stored

Per-instrument debt allocations are not broken out into individual rows —
the total debt bucket captures the allocation magnitude for analytics.
Per-instrument detail is already in `rae_executions.final_debt_allocations`.

## Consequences

- The data moat begins accruing from this session
- Aggregate queries like "average monthly INVESTMENT allocation by stage
  transition cohort" are now possible across tenants
- `rae_execution_id` provides a join key back to the full execution detail
- The table is append-only and DELETE-denied — historical data is protected
- Future: anonymised cross-tenant analytics run against this table
