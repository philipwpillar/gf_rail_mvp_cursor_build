# ADR 007 - Consent Records

**Date:** 2026-04-21
**Status:** Accepted
**Decider:** Philip Pillar

## Context

GDPR and FCA Consumer Duty require that Rail can demonstrate, for any
household and any point in time, what data processing the user consented
to, when they consented, under which version of the terms, and whether
that consent was subsequently revoked. The Originator Implementation
Specification (§4.7) identifies consent records as a Tier 1 change:
consent cannot be backfilled retroactively.

## Decision

Create `consent_records` as an append-only log. Consent is never updated
in place - a new row is inserted each time consent state changes. Current
consent state = the most recent row per household + tier.

Four consent tiers:
- `essential` - required for service operation; granted at signup
- `analytics` - Rail internal product analytics (PostHog); granted at signup
- `marketing` - email marketing; not granted at signup, opt-in only
- `data_sharing` - anonymised cross-tenant analytics for Originator Rail;
  not granted at signup, opt-in only

`lib/server/consent.ts` provides:
- `hasConsent(supabase, householdId, tier)` - returns boolean
- `writeInitialConsent(supabase, householdId)` - writes four rows at signup

Initial consent rows are written during onboarding when a new
`household_profiles` row is created. Re-onboarding (existing profile)
does not overwrite consent - the user's existing state is preserved.

The write is non-blocking: a consent failure is logged but does not abort
onboarding. The service is more important than the consent record in the
onboarding flow; the record will be written on next login if absent.

## RLS

INSERT and SELECT allowed per user. No UPDATE or DELETE policy = both
operations denied. The log is immutable - revocation creates a new row
with `granted = false`, it does not delete the prior grant.

## Consent version

`CONSENT_VERSION = "1.0"` is pinned in `lib/server/consent.ts`.
Increment this constant and write new rows when the consent terms change.
Old rows retain their original version string for audit.

## What hasConsent is not yet wired to

`hasConsent()` is available for future use in:
- Analytics event emission (check `analytics` before calling PostHog)
- Data sharing pipelines (check `data_sharing` before anonymised export)
- Marketing email triggers (check `marketing` before Resend campaigns)

Wiring these call sites is deferred - the infrastructure is in place.

## Alternatives considered

**Single boolean on household_profiles:** Cannot represent per-tier
granularity, cannot represent historical state, cannot be audited for
a specific point in time. Rejected.

**Versioned JSON blob on household_profiles:** Not queryable, not
auditable per tier. Rejected.
