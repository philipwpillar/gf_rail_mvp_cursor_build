/**
 * lib/server/tenant-context.ts
 *
 * Tenant resolution helper for the Rail multi-tenant architecture.
 *
 * Phase 0A: single tenant only. RAIL_UK_DIRECT_TENANT_ID is the fixed UUID
 * inserted by the tenants table seed. getCurrentTenantId() is a stub that
 * always returns this value — in Phase 1 it will resolve from JWT claims
 * or the X-Tenant-Id request header.
 *
 * This constant must match the UUID inserted into the tenants table in the
 * Stage A SQL migration.
 */

export const RAIL_UK_DIRECT_TENANT_ID = "00000000-0000-0000-0000-000000001001" as const;

/**
 * Returns the current tenant ID for use in DB inserts and queries.
 * Phase 0A stub: always returns rail_uk_direct.
 * Phase 1: will accept a request context and resolve from JWT/header.
 */
export function getCurrentTenantId(): string {
  // TODO: Phase 1 — resolve from X-Tenant-Id header or JWT app_metadata.tenant_id
  return RAIL_UK_DIRECT_TENANT_ID;
}
