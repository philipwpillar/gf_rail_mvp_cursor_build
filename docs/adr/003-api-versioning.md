# ADR 003 — API Versioning and Hardening

**Date:** 2026-04-21
**Status:** Accepted
**Decider:** Philip Pillar

## Context

The Rail Allocation Engine was exposed as an unversioned HTTP endpoint
(`/api/rae`). Partners, investor reviewers, and future internal consumers
(mobile app, licensees) cannot safely consume an unversioned API - any
URL or contract change is a breaking change with no migration path.
The Originator Implementation Specification (§4.4) identifies this as a
Tier 1 change: versioning is free to add now, expensive to retrofit after
the first external consumer depends on the existing URL.

## Decision

1. Move the RAE endpoint to `/api/v1/rae`. The old `/api/rae` route
   returns HTTP 308 Permanent Redirect for 6 months, then is removed.
2. Add `X-Request-Id` header support: extracted or generated per request,
   echoed in response header and `meta.request_id`. Propagated into
   `rae_executions.request_id` for end-to-end traceability.
3. Add `Idempotency-Key` header support with 24-hour TTL caching in the
   `idempotency_cache` table. Duplicate requests within TTL return the
   cached response without writing a new audit row.
4. Standardise response envelopes:
   - Success: `{ data: { result, projections, context, decision_id }, meta: { request_id, engine_version, policy_version } }`
   - Error: `{ error: { code, message }, meta: { request_id } }`
5. Add `contracts/openapi.yaml` as the public API contract. TypeScript
   types manually derived in `contracts/types.ts`.
6. Structured JSON logging on every request: `rae.request`, `rae.response`,
   `rae.error`, `rae.idempotency_hit` - each carrying `request_id`.

## Engine and policy version stubs

`ENGINE_VERSION = '0.1.0'` is pinned in `lib/api/request-context.ts`.
`POLICY_VERSION = 'default-v1'` is a stub that will be replaced in
Stage D (policy extraction) when `RailPolicy` becomes a versioned object.

## Internal vs HTTP consumers

Dashboard server components call `buildRaeRecommendation()` directly
and receive the internal `RaeApiPayload` shape. The HTTP endpoint wraps
this in the v1 envelope. The internal shape and HTTP shape are deliberately
kept separate - the HTTP contract is stable for external consumers while
the internal type can evolve freely.

## Consequences

- `/api/v1/rae` is the canonical endpoint from this session onwards
- Every RAE execution has an end-to-end `request_id` in logs and DB
- Idempotent callers can safely retry without duplicate audit rows
- The 308 redirect on `/api/rae` must be removed on or after 2026-10-21
- `contracts/openapi.yaml` must be kept in sync when the response schema changes

## Alternatives considered

**Keep unversioned, add version header instead of URL path:** Non-standard
and harder for proxy/caching infrastructure to route. URL path versioning
is the industry convention.

**Generate TypeScript types from OpenAPI via CI:** Correct long-term
approach. Deferred - adding openapi-typescript to the build pipeline is
Phase 0B scope.
