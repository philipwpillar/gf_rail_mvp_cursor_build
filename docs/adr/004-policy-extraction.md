# ADR 004 — Policy Extraction

**Date:** 2026-04-21
**Status:** Accepted
**Decider:** Philip Pillar

## Context

All numeric thresholds, ratios, and rules governing the Rail Allocation
Engine were compiled directly into engine TypeScript files. This made
partner-specific policy overrides, FCA audit of governing rules, and
the structural one-and-done credit guarantee impossible to implement
without modifying engine code. The Originator Implementation Specification
(§4.5) identifies policy extraction as a Tier 1 change.

## Decision

Create `lib/rae/policy/` with two files:

- `types.ts` — the `RailPolicy` interface (all numeric thresholds as typed fields)
- `defaults.ts` — `DEFAULT_POLICY` (`version: '1.0.0'`) with the values
  previously scattered across engine files

All engine functions (`computeBMin`, `computeBTarget`, `classifyStage`,
`computeAlpha`, `computeBaseAllocation`, `applyShockAdjustment`, `runRAE`)
accept `policy: RailPolicy` as an explicit parameter. `runRAE` requires
policy to be passed — no silent default. All callers pass `DEFAULT_POLICY`
explicitly.

`RAEConfig` and `DEFAULT_RAE_CONFIG` are removed from `lib/rae/types.ts`.

Every `rae_executions` insert records `policy_version: DEFAULT_POLICY.version`
so every audit row permanently records which policy governed it.

`POLICY_VERSION = 'default-v1'` stub removed from `lib/api/request-context.ts`.
The v1 route reads `DEFAULT_POLICY.version` directly.

## Thresholds extracted

| Field | Value | Previous location |
|-------|-------|-------------------|
| bMinWeeks | 3 | classifier.ts via DEFAULT_RAE_CONFIG |
| bTargetWeeks | 6 | classifier.ts via DEFAULT_RAE_CONFIG |
| aprThreshold | 0.07 | classifier.ts via DEFAULT_RAE_CONFIG |
| shockThreshold | 0.25 | shock.ts via DEFAULT_RAE_CONFIG |
| fragilityLambda | 1.5 | types.ts DEFAULT_RAE_CONFIG |
| shockDebtRedirectCap | 0.5 | shock.ts hardcoded literal |
| shockInvestmentRedirectCap | 0.5 | shock.ts hardcoded literal |
| avalancheThreshold | 0.6 | allocator.ts hardcoded literal |
| avalancheWeight | 1.0 | allocator.ts hardcoded literal |
| blendedAvalancheWeight | 0.7 | allocator.ts hardcoded literal |
| blendedSnowballWeight | 0.3 | allocator.ts hardcoded literal |

## Investment growth rate not extracted

`projections.ts` contains `ANNUAL_GROWTH_RATE = 0.07`. This is an
illustrative projection assumption, not a policy rule governing allocation.
It is not extracted into RailPolicy. It will be addressed if Rail Invest
introduces configurable growth scenarios.

## Consequences

- Partner policy overrides require one object spread and changed fields
- FCA audit can inspect the exact policy object from any `rae_executions` row
- The one-and-done credit rule (Stage F) has a policy primitive to hang on
- All callers must pass policy explicitly — no silent default
- `DEFAULT_POLICY` is `Object.freeze()`d — no runtime mutation possible
