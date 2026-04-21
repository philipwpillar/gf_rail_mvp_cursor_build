/**
 * lib/server/consent.ts
 *
 * Consent record helpers for Rail's FCA Consumer Duty and GDPR compliance.
 *
 * Consent is stored as an append-only log in consent_records.
 * Current state = the most recent row for a given household + tier.
 *
 * Tiers:
 *   essential     - required for service operation; always true at signup
 *   analytics     - Rail internal product analytics (PostHog); true at signup
 *   marketing     - email marketing; false at signup, opt-in only
 *   data_sharing  - anonymised data sharing for Originator analytics; false at signup
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentTenantId } from "@/lib/server/tenant-context";

export type ConsentTier = "essential" | "analytics" | "marketing" | "data_sharing";

/** The consent version string. Increment when the consent terms change. */
export const CONSENT_VERSION = "1.0" as const;

/**
 * Returns true if the most recent consent record for this household and
 * tier has granted = true. Returns false if no record exists.
 *
 * Uses maybeSingle() - absence of a record is treated as not consented.
 */
export async function hasConsent(
  supabase: SupabaseClient,
  householdId: string,
  tier: ConsentTier,
): Promise<boolean> {
  const { data } = await supabase
    .from("consent_records")
    .select("granted")
    .eq("tenant_id", getCurrentTenantId())
    .eq("household_id", householdId)
    .eq("consent_tier", tier)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.granted === true;
}

/**
 * Writes initial consent rows for a newly created household.
 * Called once during onboarding when a new household_profiles row is created.
 *
 * essential + analytics: granted = true (required for service and product analytics)
 * marketing + data_sharing: granted = false (opt-in only, not granted at signup)
 *
 * Non-blocking: failures are logged but never fail the caller.
 */
export async function writeInitialConsent(
  supabase: SupabaseClient,
  householdId: string,
): Promise<void> {
  const tiers: { tier: ConsentTier; granted: boolean }[] = [
    { tier: "essential", granted: true },
    { tier: "analytics", granted: true },
    { tier: "marketing", granted: false },
    { tier: "data_sharing", granted: false },
  ];

  const rows = tiers.map(({ tier, granted }) => ({
    tenant_id: getCurrentTenantId(),
    household_id: householdId,
    consent_tier: tier,
    granted,
    version: CONSENT_VERSION,
  }));

  const { error } = await supabase.from("consent_records").insert(rows);
  if (error) {
    console.error("[consent] Initial consent write failed:", error.message);
  }
}
