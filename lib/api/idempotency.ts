/**
 * lib/api/idempotency.ts
 *
 * Idempotency key checking and caching for the Rail v1 API.
 *
 * Idempotency-Key is optional on GET requests. When provided, the first
 * response is cached in idempotency_cache for 24 hours. Subsequent requests
 * with the same key within the TTL return the cached response and do NOT
 * write a new rae_executions row.
 *
 * TTL is enforced at read time (created_at > now() - interval '24 hours').
 * No cron job required.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentTenantId } from "@/lib/server/tenant-context";

const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * Checks whether a cached response exists for this user + idempotency key.
 * Returns the cached response body if found and within TTL, null otherwise.
 */
export async function checkIdempotencyCache(
  supabase: SupabaseClient,
  userId: string,
  idempotencyKey: string | null,
): Promise<Record<string, unknown> | null> {
  if (!idempotencyKey) return null;

  const cutoff = new Date(
    Date.now() - IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data } = await supabase
    .from("idempotency_cache")
    .select("response_body")
    .eq("tenant_id", getCurrentTenantId())
    .eq("user_id", userId)
    .eq("idempotency_key", idempotencyKey)
    .gte("created_at", cutoff)
    .maybeSingle();

  return (data?.response_body as Record<string, unknown>) ?? null;
}

/**
 * Stores a response body against a user + idempotency key.
 * Upserts so that a retry of the store itself is safe.
 * No-ops if idempotencyKey is null.
 */
export async function storeIdempotencyCache(
  supabase: SupabaseClient,
  userId: string,
  idempotencyKey: string | null,
  responseBody: Record<string, unknown>,
): Promise<void> {
  if (!idempotencyKey) return;

  const { error } = await supabase.from("idempotency_cache").upsert(
    {
      tenant_id: getCurrentTenantId(),
      user_id: userId,
      idempotency_key: idempotencyKey,
      response_body: responseBody,
    },
    { onConflict: "user_id,idempotency_key" },
  );

  if (error) {
    // Non-blocking: log but do not fail the request
    console.error("[idempotency] cache store failed:", error.message);
  }
}
