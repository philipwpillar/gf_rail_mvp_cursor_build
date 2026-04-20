/**
 * lib/server/types.ts
 *
 * Canonical server-layer row types.
 * These mirror the Supabase schema in rail_database_schema.md.
 * Import these instead of declaring local HouseholdRow / DebtRow types
 * in individual pages or API routes.
 *
 * When the Supabase-generated typed client is introduced in Phase 0B,
 * these types will be replaced by the generated equivalents.
 */

export type HouseholdRow = {
  id: string;
  tenant_id: string;
  display_name: string | null;
  monthly_income: number;
  income_volatility: number;
  fixed_obligations: number;
  buffer_balance: number;
  plan_commitment_score: number;
};

export type DebtRow = {
  id: string;
  tenant_id: string;
  label: string | null;
  lender: string | null;
  debt_type: "CARD" | "LOAN" | "BNPL" | "OVERDRAFT" | "OTHER";
  balance: number;
  apr: number;
  min_payment: number;
  is_active: boolean;
};

export type LatestExecutionRow = {
  executed_at: string;
  surplus: number | null;
  stage: string | null;
  b_min: number | null;
  b_target: number | null;
  base_buffer_contribution: number | null;
  base_investment_contribution: number | null;
  final_buffer_contribution: number | null;
  final_investment_contribution: number | null;
  final_debt_allocations: import("@/lib/rae/types").DebtAllocation[] | null;
  rationale: unknown;
};
