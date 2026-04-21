import type { HouseholdSnapshot, RAEResult } from "@/lib/rae/types";
import { DEFAULT_POLICY } from "@/lib/rae/policy/defaults";
import { ENGINE_VERSION } from "@/lib/api/request-context";
import { runRAE } from "@/lib/rae/engine";
import { computeProjections, type ProjectionResult } from "@/lib/rae/projections";
import {
  buildHouseholdSnapshot,
  type DebtSnapshotRow,
} from "@/lib/server/snapshot-utils";
import { applySurplusDelta } from "@/lib/server/scenario";
import { getCurrentTenantId } from "@/lib/server/tenant-context";
import type { SupabaseClient } from "@supabase/supabase-js";

type HouseholdRow = {
  id: string;
  tenant_id: string;
  display_name: string | null;
  monthly_income: number;
  income_volatility: number;
  fixed_obligations: number;
  buffer_balance: number;
  plan_commitment_score: number;
  currency: string;
  region: string;
};

type DebtRow = DebtSnapshotRow;

export type RaeApiPayload = {
  result: RAEResult;
  projections: ProjectionResult;
  context: {
    householdName: string;
    debts: {
      id: string;
      label: string;
      apr: number;
      balance: number;
      minPayment: number;
      isActive: boolean;
    }[];
  };
  meta: {
    auditLogged: boolean;
    profileBootstrapped: boolean;
    /** ID of the rae_executions row written for this recommendation. */
    executionId?: string;
  };
};

type BuildRaeRecommendationInput = {
  supabase: SupabaseClient;
  userId: string;
  userEmail?: string | null;
  writeAudit: boolean;
  surplusDeltaPence?: number;
  requestId?: string;
};

async function ensureHouseholdProfile(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null,
): Promise<{ household: HouseholdRow; profileBootstrapped: boolean }> {
  const { data: existing, error: existingError } = await supabase
    .from("household_profiles")
    .select(
      "id, tenant_id, display_name, monthly_income, income_volatility, fixed_obligations, buffer_balance, plan_commitment_score, currency, region",
    )
    .eq("user_id", userId)
    .maybeSingle<HouseholdRow>();

  if (existingError) throw new Error("Failed to load household profile.");
  if (existing) return { household: existing, profileBootstrapped: false };

  const fallbackName = userEmail?.split("@")[0]?.trim() || "New Household";
  const { data: inserted, error: insertError } = await supabase
    .from("household_profiles")
    .insert({
      user_id: userId,
      tenant_id: getCurrentTenantId(),
      display_name: fallbackName,
      is_synthetic: false,
      monthly_income: 0,
      income_volatility: 0,
      fixed_obligations: 0,
      buffer_balance: 0,
      plan_commitment_score: 0.5,
    })
    .select(
      "id, tenant_id, display_name, monthly_income, income_volatility, fixed_obligations, buffer_balance, plan_commitment_score, currency, region",
    )
    .single<HouseholdRow>();

  if (insertError || !inserted) throw new Error("Failed to create household profile.");
  return { household: inserted, profileBootstrapped: true };
}

export async function buildRaeRecommendation({
  supabase,
  userId,
  userEmail,
  writeAudit,
  surplusDeltaPence = 0,
  requestId,
}: BuildRaeRecommendationInput): Promise<RaeApiPayload> {
  const { household, profileBootstrapped } = await ensureHouseholdProfile(
    supabase,
    userId,
    userEmail,
  );

  const { data: debtRows, error: debtError } = await supabase
    .from("debt_instruments")
    .select("id, label, lender, debt_type, balance, apr, min_payment, is_active")
    .eq("household_id", household.id)
    .returns<DebtRow[]>();

  if (debtError) throw new Error("Failed to load debt instruments.");

  const scenarioAdjustedHousehold = {
    ...household,
    monthly_income: applySurplusDelta(household.monthly_income, surplusDeltaPence),
  };

  const snapshot: HouseholdSnapshot = buildHouseholdSnapshot(scenarioAdjustedHousehold, debtRows ?? []);

  const result = runRAE(snapshot, DEFAULT_POLICY);
  const projections = computeProjections(snapshot);

  // Compliance guard: only baseline recommendations are written to immutable audit logs.
  const shouldWriteAudit = writeAudit && surplusDeltaPence === 0;
  let auditLogged = false;
  let executionId: string | undefined;
  if (shouldWriteAudit) {
    const { data: executionRow, error: executionError } = await supabase
      .from("rae_executions")
      .insert({
        household_id: household.id,
        tenant_id: getCurrentTenantId(),
        input_snapshot: snapshot,
        surplus: result.surplus,
        obligation_stress: result.obligationStress,
        stage: result.stage,
        b_min: result.bMin,
        b_target: result.bTarget,
        base_buffer_contribution: result.baseAllocation.bufferContribution,
        base_investment_contribution: result.baseAllocation.investmentContribution,
        base_debt_allocations: result.baseAllocation.debtAllocations,
        p_shock_used: result.pShockUsed,
        shock_threshold_used: DEFAULT_POLICY.shockThreshold,
        policy_version: DEFAULT_POLICY.version,
        shock_applied: result.shockApplied,
        shock_factor: result.shockFactor,
        shock_redirect_amount: result.shockRedirectAmount,
        final_buffer_contribution: result.finalAllocation.bufferContribution,
        final_investment_contribution: result.finalAllocation.investmentContribution,
        final_debt_allocations: result.finalAllocation.debtAllocations,
        rationale: result.rationale,
        ...(requestId ? { request_id: requestId } : {}),
      })
      .select("id")
      .single();
    auditLogged = !executionError;
    executionId = (executionRow as { id?: string } | null)?.id;
    if (executionError) {
      console.error("RAE audit insert failed:", executionError.message);
    }

    // Write allocation decision event stream.
    // One row per non-zero allocation bucket. Non-blocking: failures
    // are logged but never propagate to the caller.
    // This is the data moat primitive — anonymised aggregate queries
    // across tenants and time power Originator Rail analytics.
    if (!executionError && executionId) {
      const decisionRows: {
        tenant_id: string;
        household_id: string;
        rae_execution_id: string;
        decision_type: "BUFFER" | "DEBT" | "INVESTMENT";
        amount_pence: number;
        stage: string;
        engine_version: string;
        policy_version: string;
        request_id?: string;
      }[] = [];

      const base = {
        tenant_id: getCurrentTenantId(),
        household_id: household.id,
        rae_execution_id: executionId,
        stage: result.stage as string,
        engine_version: ENGINE_VERSION,
        policy_version: DEFAULT_POLICY.version,
        ...(requestId ? { request_id: requestId } : {}),
      };

      if (result.finalAllocation.bufferContribution > 0) {
        decisionRows.push({
          ...base,
          decision_type: "BUFFER",
          amount_pence: result.finalAllocation.bufferContribution,
        });
      }

      const debtTotal = result.finalAllocation.debtAllocations.reduce(
        (sum, d) => sum + d.amount,
        0,
      );
      if (debtTotal > 0) {
        decisionRows.push({
          ...base,
          decision_type: "DEBT",
          amount_pence: debtTotal,
        });
      }

      if (result.finalAllocation.investmentContribution > 0) {
        decisionRows.push({
          ...base,
          decision_type: "INVESTMENT",
          amount_pence: result.finalAllocation.investmentContribution,
        });
      }

      if (decisionRows.length > 0) {
        const { error: decisionError } = await supabase
          .from("allocation_decisions")
          .insert(decisionRows);
        if (decisionError) {
          console.error("Allocation decisions insert failed:", decisionError.message);
        }
      }
    }
  }

  return {
    result,
    projections,
    context: {
      householdName: household.display_name ?? "Household",
      debts: (debtRows ?? []).map((debt) => ({
        id: debt.id,
        label: debt.label ?? debt.id,
        apr: debt.apr,
        balance: debt.balance,
        minPayment: debt.min_payment,
        isActive: debt.is_active,
      })),
    },
    meta: { auditLogged, profileBootstrapped, executionId },
  };
}
