# ADR 001 — Multi-Tenancy Structural Retrofit

**Date:** 2026-04-20
**Status:** Accepted
**Decider:** Philip Pillar

## Context

The Rail MVP was built as a single-tenant system with GBP/GB implicit
throughout. The Originator Rail thesis requires multi-tenancy to support
white-label partners, jurisdictional variants, and API licensing. The
Originator Implementation Specification (§4.1) identifies multi-tenancy
as a Tier 1 change: cheap to add before scale, expensive to retrofit after.

## Decision

Add a `tenants` table and a `tenant_id UUID NOT NULL` column to all
user-scoped tables: `household_profiles`, `debt_instruments`,
`rae_executions`, `session_audit_log`.

A single seed tenant (`rail_uk_direct`, UUID `00000000-0000-0000-0000-000000001001`)
is inserted. All existing and new rows are backfilled or defaulted to this UUID.

A `lib/server/tenant-context.ts` helper exports `getCurrentTenantId()`,
which currently returns the `rail_uk_direct` UUID as a constant. This is
the single place to update when resolving tenant from JWT claims or headers.

## RLS enforcement deferral

Full RLS enforcement of `tenant_id` (i.e. `auth.uid() = user_id AND tenant_id = current_tenant_id()`)
requires either JWT app_metadata claims or a Postgres session variable set
on every request. Neither mechanism is in scope for seed stage with a single
tenant.

Decision: existing RLS policies (`auth.uid() = user_id`) are sufficient for
single-tenant operation. The `tenant_id` column default ensures every row is
correctly scoped. Full RLS enforcement of `tenant_id` is deferred to the
first session that introduces a second tenant.

## Consequences

- Every insert path now explicitly sets `tenant_id` via `getCurrentTenantId()`
- The DB schema is structurally multi-tenant from this point forward
- Phase 1 work to enforce `tenant_id` in RLS requires only: (a) update
  `getCurrentTenantId()` to read from request context, and (b) update the
  four RLS policies. No schema migration required.
- The data moat begins accruing tenant-scoped from this session onwards

## Alternatives considered

**Use an env var for tenant ID:** Adds env var management overhead with no
benefit at single-tenant stage. Deferred — `getCurrentTenantId()` can read
from env when needed.

**Add tenant_id to RLS immediately via hardcoded UUID:** Possible but brittle;
a hardcoded UUID in SQL policy is harder to change than a function call in TS.
Deferred per above.
