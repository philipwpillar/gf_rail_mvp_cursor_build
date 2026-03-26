import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runRAE } from "@/lib/rae/engine";
import {
  DEFAULT_RAE_CONFIG,
  type DebtInstrument,
  type HouseholdSnapshot,
} from "@/lib/rae/types";

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

export const dynamic = "force-dynamic";

function deriveShockProbability(monthlyIncome: number, incomeVolatility: number): number {
  if (monthlyIncome <= 0) return 0;
  return Math.max(0, Math.min((incomeVolatility / monthlyIncome) * 2, 1));
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return NextResponse.json(
      { error: "Failed to verify authenticated user." },
      { status: 500 },
    );
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: household, error: householdError } = await supabase
    .from("household_profiles")
    .select(
      "id, display_name, monthly_income, income_volatility, fixed_obligations, buffer_balance, plan_commitment_score",
    )
    .eq("user_id", user.id)
    .maybeSingle<HouseholdRow>();

  if (householdError) {
    return NextResponse.json(
      { error: `Failed to load household profile: ${householdError.message}` },
      { status: 500 },
    );
  }

  if (!household) {
    return NextResponse.json(
      { error: "No household profile found for this user." },
      { status: 404 },
    );
  }

  const { data: debtRows, error: debtError } = await supabase
    .from("debt_instruments")
    .select("id, label, lender, debt_type, balance, apr, min_payment, is_active")
    .eq("household_id", household.id)
    .returns<DebtRow[]>();

  if (debtError) {
    return NextResponse.json(
      { error: `Failed to load debt instruments: ${debtError.message}` },
      { status: 500 },
    );
  }

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

  if (executionError) {
    return NextResponse.json(
      { error: `Failed to write RAE execution audit log: ${executionError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
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
  });
}
