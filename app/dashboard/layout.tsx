import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "./components/dashboard-shell";
import { parseSurplusDeltaCookie } from "@/lib/server/scenario";
import { AdvisorButton } from "@/components/advisor/AdvisorButton";
import { buildHouseholdSnapshot, type DebtSnapshotRow } from "@/lib/server/snapshot-utils";
import { applySurplusDelta } from "@/lib/server/scenario";
import { runRAE } from "@/lib/rae/engine";
import { type PipelineStage } from "@/lib/rae/types";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type DashboardLayoutProps = {
  children: ReactNode;
};

type HouseholdRow = {
  id: string;
  display_name: string | null;
  monthly_income: number;
  income_volatility: number;
  fixed_obligations: number;
  buffer_balance: number;
  plan_commitment_score: number;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const cookieStore = await cookies();
  const initialSidebarCollapsed = cookieStore.get("rail.sidebar.collapsed")?.value === "true";
  const initialSurplusDeltaPence = parseSurplusDeltaCookie(
    cookieStore.get("rail.scenario.surplus_delta")?.value,
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: household } = await supabase
    .from("household_profiles")
    .select(
      "id, display_name, monthly_income, income_volatility, fixed_obligations, buffer_balance, plan_commitment_score",
    )
    .eq("user_id", user.id)
    .maybeSingle<HouseholdRow>();

  if (!household) {
    redirect("/onboarding");
  }

  const { data: debtRows } = household
    ? await supabase
        .from("debt_instruments")
        .select("id, label, lender, balance, apr, min_payment, debt_type, is_active")
        .eq("household_id", household.id)
        .returns<DebtSnapshotRow[]>()
    : { data: [] };

  const householdName = household?.display_name ?? "Household";
  const householdId = household?.id;
  const adjustedIncome = household ? applySurplusDelta(household.monthly_income, initialSurplusDeltaPence) : 0;

  let topBarStage: PipelineStage | null = null;
  let topBarSurplus: number | null = null;

  if (household) {
    try {
      const snapshot = buildHouseholdSnapshot({ ...household, monthly_income: adjustedIncome }, debtRows ?? []);
      const raeResult = runRAE(snapshot);
      topBarStage = raeResult.stage;
      topBarSurplus = raeResult.surplus;
    } catch {
      // non-blocking — top bar degrades gracefully
    }
  }

  return (
    <DashboardShell
      householdName={householdName}
      initialSidebarCollapsed={initialSidebarCollapsed}
      initialSurplusDeltaPence={initialSurplusDeltaPence}
      topBarStage={topBarStage}
      topBarSurplus={topBarSurplus}
    >
      {children}
      {householdId ? <AdvisorButton householdId={householdId} householdName={householdName} /> : null}
    </DashboardShell>
  );
}

