import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsPage, type DebtEntry, type HouseholdFormData } from "./settings_page";

export const dynamic = "force-dynamic";

type HouseholdRow = {
  id: string;
  display_name: string | null;
  monthly_income: number;
  fixed_obligations: number;
  buffer_balance: number;
};

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

  const { data: household } = await supabase
    .from("household_profiles")
    .select("id, display_name, monthly_income, fixed_obligations, buffer_balance")
    .eq("user_id", user.id)
    .maybeSingle<HouseholdRow>();

  const { data: debtRows } = household
    ? await supabase
        .from("debt_instruments")
        .select("id, label, debt_type, balance, apr, min_payment, is_active")
        .eq("household_id", household.id)
        .eq("is_active", true)
        .order("apr", { ascending: false })
        .returns<DebtRow[]>()
    : { data: [] as DebtRow[] };

  const initialHousehold: HouseholdFormData = household
    ? {
        displayName: household.display_name ?? "",
        monthlyIncomeStr: (household.monthly_income / 100).toFixed(2),
        fixedObligationsStr: (household.fixed_obligations / 100).toFixed(2),
        bufferBalanceStr: (household.buffer_balance / 100).toFixed(2),
      }
    : {
        displayName: "",
        monthlyIncomeStr: "",
        fixedObligationsStr: "",
        bufferBalanceStr: "",
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
