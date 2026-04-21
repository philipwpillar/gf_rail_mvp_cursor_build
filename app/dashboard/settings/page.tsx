import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsPage, type DebtEntry, type HouseholdFormData } from "./settings-page";

export const dynamic = "force-dynamic";

type HouseholdRow = {
  id: string;
  display_name: string | null;
  monthly_income: number;
  income_volatility: number;
  fixed_obligations: number;
  buffer_balance: number;
  plan_commitment_score: number;
};

function deriveIncomeType(
  incomeVolatility: number,
  monthlyIncome: number,
): "stable" | "variable" | "highly-variable" {
  if (monthlyIncome <= 0 || incomeVolatility <= 0) return "stable";
  const ratio = incomeVolatility / monthlyIncome;
  if (ratio <= 0.1) return "stable";
  if (ratio <= 0.3) return "variable";
  return "highly-variable";
}

type DebtRow = {
  id: string;
  label: string | null;
  debt_type: "CARD" | "LOAN" | "BNPL" | "OVERDRAFT" | "OTHER";
  balance: number;
  apr: number;
  min_payment: number;
  is_active: boolean;
};

export default async function SettingsRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: household, error: householdError } = await supabase
    .from("household_profiles")
    .select(
      "id, display_name, monthly_income, income_volatility, fixed_obligations, buffer_balance, plan_commitment_score",
    )
    .eq("user_id", user.id)
    .maybeSingle<HouseholdRow>();
  if (householdError) {
    throw new Error("Failed to load household profile.");
  }

  const { data: debtRows, error: debtRowsError } = household
    ? await supabase
        .from("debt_instruments")
        .select("id, label, debt_type, balance, apr, min_payment, is_active")
        .eq("household_id", household.id)
        .eq("is_active", true)
        .order("apr", { ascending: false })
        .returns<DebtRow[]>()
    : { data: [] as DebtRow[], error: null };
  if (debtRowsError) {
    throw new Error("Failed to load debt instruments.");
  }

  const initialHousehold: HouseholdFormData = household
    ? {
        displayName: household.display_name ?? "",
        monthlyIncomeStr: (household.monthly_income / 100).toFixed(2),
        fixedObligationsStr: (household.fixed_obligations / 100).toFixed(2),
        bufferBalanceStr: (household.buffer_balance / 100).toFixed(2),
        incomeType: deriveIncomeType(household.income_volatility, household.monthly_income),
        commitmentScore: household.plan_commitment_score ?? 0.6,
      }
    : {
        displayName: "",
        monthlyIncomeStr: "",
        fixedObligationsStr: "",
        bufferBalanceStr: "",
        incomeType: "stable",
        commitmentScore: 0.6,
      };

  const initialDebts: DebtEntry[] = (debtRows ?? []).map((d) => ({
    localId: d.id,
    label: d.label ?? "",
    debtType: d.debt_type,
    balanceStr: (d.balance / 100).toFixed(2),
    aprStr: (d.apr * 100).toFixed(1),
    minPaymentStr: (d.min_payment / 100).toFixed(2),
  }));

  return <SettingsPage initialHousehold={initialHousehold} initialDebts={initialDebts} />;
}
