import { DEFAULT_RAE_CONFIG, type DebtInstrument, type HouseholdSnapshot, type RAEResult } from "@/lib/rae/types";
import { runRAE } from "@/lib/rae/engine";
import type { SupabaseClient } from "@supabase/supabase-js";

type HouseholdRow = {
  id: string;
  display_name: string | null;
  monthly_income: number;
  income_volatility: number;
  fixed_obligations: number;
  buffer_balance: number;
  plan_commitment_score: number;
};

type DebtRow = {
  id: string;
  label: string | null;
  lender: string | null;
  debt_type: DebtInstrument["type"];
  balance: number;
  apr: number;
  min_payment: number;
  is_active: boolean;
};

export type RaeApiPayload = {
  result: RAEResult;
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
  };
};

type BuildRaeRecommendationInput = {
  supabase: SupabaseClient;
  userId: string;
  userEmail?: string | null;
  writeAudit: boolean;
};

function deriveShockProbability(monthlyIncome: number, incomeVolatility: number): number {
  if (monthlyIncome <= 0) return 0;
  return Math.max(0, Math.min((incomeVolatility / monthlyIncome) * 2, 1));
}

async function ensureHouseholdProfile(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string | null,
): Promise<{ household: HouseholdRow; profileBootstrapped: boolean }> {
  const { data: existing, error: existingError } = await supabase
    .from("household_profiles")
    .select(
      "id, display_name, monthly_income, income_volatility, fixed_obligations, buffer_balance, plan_commitment_score",
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
      display_name: fallbackName,
      is_synthetic: false,
      monthly_income: 0,
      income_volatility: 0,
      fixed_obligations: 0,
      buffer_balance: 0,
      plan_commitment_score: 0.5,
    })
    .select(
      "id, display_name, monthly_income, income_volatility, fixed_obligations, buffer_balance, plan_commitment_score",
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

  const pShock = deriveShockProbability(household.monthly_income, household.income_volatility);
  const snapshot: HouseholdSnapshot = {
    monthlyIncome: household.monthly_income,
    incomeVolatility: household.income_volatility,
    fixedObligations: household.fixed_obligations,
    bufferBalance: household.buffer_balance,
    planCommitmentScore: household.plan_commitment_score,
    incomeShockProbability: pShock,
    debts: (debtRows ?? []).map((debt) => ({
      id: debt.id,
      label: debt.label ?? undefined,
      lender: debt.lender,
      type: debt.debt_type,
      balance: debt.balance,
      apr: debt.apr,
      minPayment: debt.min_payment,
      isActive: debt.is_active,
    })),
  };

  const result = runRAE(snapshot);

  let auditLogged = false;
  if (writeAudit) {
    const { error: executionError } = await supabase.from("rae_executions").insert({
      household_id: household.id,
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
      shock_threshold_used: DEFAULT_RAE_CONFIG.shockThreshold,
      shock_applied: result.shockApplied,
      shock_factor: result.shockFactor,
      shock_redirect_amount: result.shockRedirectAmount,
      final_buffer_contribution: result.finalAllocation.bufferContribution,
      final_investment_contribution: result.finalAllocation.investmentContribution,
      final_debt_allocations: result.finalAllocation.debtAllocations,
      rationale: result.rationale,
    });
    auditLogged = !executionError;
    if (executionError) {
      console.error("RAE audit insert failed:", executionError.message);
    }
  }

  return {
    result,
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
    meta: { auditLogged, profileBootstrapped },
  };
}
