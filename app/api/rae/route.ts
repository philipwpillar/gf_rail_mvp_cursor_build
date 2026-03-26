import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runRAE } from "@/lib/rae/engine";
import type { DebtInstrument, HouseholdSnapshot } from "@/lib/rae/types";

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

  const snapshot: HouseholdSnapshot = {
    monthlyIncome: household.monthly_income,
    incomeVolatility: household.income_volatility,
    fixedObligations: household.fixed_obligations,
    bufferBalance: household.buffer_balance,
    planCommitmentScore: household.plan_commitment_score,
    // TODO(Stage 7): calibrate pShock from volatility history or a modeled source.
    incomeShockProbability: 0,
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
