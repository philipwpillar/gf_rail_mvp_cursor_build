import { createClient } from "@/lib/supabase/server";
import { computeProjections } from "@/lib/rae/projections";
import { runRAE } from "@/lib/rae/engine";
import { DEFAULT_POLICY } from "@/lib/rae/policy/defaults";
import { PipelineStage } from "@/lib/rae/types";
import { buildHouseholdSnapshot, type DebtSnapshotRow } from "@/lib/server/snapshot-utils";
import { applySurplusDelta, parseSurplusDeltaCookie } from "@/lib/server/scenario";
import { formatPounds } from "@/lib/utils";
import { formatMoney } from "@/lib/display/money";
import { OwnershipClient } from "@/components/ownership/OwnershipClient";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type HouseholdRow = {
  id: string;
  monthly_income: number;
  income_volatility: number;
  fixed_obligations: number;
  buffer_balance: number;
  plan_commitment_score: number;
};

type DebtRow = DebtSnapshotRow;

type LatestExecution = {
  final_investment_contribution: number;
  b_target: number;
  stage: PipelineStage;
};

export default async function OwnershipPage() {
  const cookieStore = await cookies();
  const surplusDeltaPence = parseSurplusDeltaCookie(cookieStore.get("rail.scenario.surplus_delta")?.value);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Unauthorized
      </div>
    );
  }

  const { data: household } = await supabase
    .from("household_profiles")
    .select("id, monthly_income, income_volatility, fixed_obligations, buffer_balance, plan_commitment_score")
    .eq("user_id", user.id)
    .maybeSingle<HouseholdRow>();

  if (!household) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Household profile not found.
      </div>
    );
  }

  const { data: debtRows } = await supabase
    .from("debt_instruments")
    .select("id, label, lender, balance, apr, min_payment, debt_type, is_active")
    .eq("household_id", household.id)
    .eq("is_active", true)
    .returns<DebtRow[]>();

  const { data: latestExecution } = await supabase
    .from("rae_executions")
    .select("final_investment_contribution, b_target, stage")
    .eq("household_id", household.id)
    .order("executed_at", { ascending: false })
    .limit(1)
    .maybeSingle<LatestExecution>();

  const debts = debtRows ?? [];
  const snapshot = buildHouseholdSnapshot(
    {
      ...household,
      monthly_income: applySurplusDelta(household.monthly_income, surplusDeltaPence),
    },
    debts,
  );
  const liveResult = runRAE(snapshot, DEFAULT_POLICY);

  const projections = computeProjections(snapshot);
  const isOwnershipActive = liveResult.stage === PipelineStage.STAGE_3_OWNERSHIP;
  const monthlyContributionPence = liveResult.finalAllocation.investmentContribution;
  const snap60 = projections.monthlySnapshots[59];
  const snap59 = projections.monthlySnapshots[58];
  const MONTHLY_GROWTH_RATE = 0.07 / 12;
  const projectedMonthlyContributionPence =
    snap60 && snap59
      ? Math.max(
          0,
          Math.round(snap60.investmentValue - snap59.investmentValue * (1 + MONTHLY_GROWTH_RATE)),
        )
      : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="type-h1">Ownership</h2>
        {!isOwnershipActive ? (
          <div className="mt-3 space-y-2 type-body text-zinc-700">
            <p className="font-medium">Not yet active</p>
            <p>Once your buffer is funded and high-rate debt is cleared, your surplus flows here.</p>
            <p>
              {/* TODO: thread currency from household row when multi-currency goes live */}
              Once active, Rail estimates you will invest approximately{" "}
              {formatMoney(projectedMonthlyContributionPence, "GBP", { decimals: 0 })}/month.
            </p>
            <p>
              Estimated activation:{" "}
              {projections.debtFreeMonth === null
                ? "beyond 60 months"
                : projections.debtFreeMonth === 0
                  ? "already active"
                  : `Month ${projections.debtFreeMonth}`}
              .
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2 type-body text-zinc-700">
            <p className="font-medium">
              Investing {formatPounds(latestExecution?.final_investment_contribution ?? 0)} this month
            </p>
            <p>
              Buffer target ({formatPounds(latestExecution?.b_target ?? 0)}) is met and ownership phase is active.
            </p>
          </div>
        )}
      </div>

      <OwnershipClient
        monthlyContributionPence={monthlyContributionPence}
        projectedMonthlyContributionPence={projectedMonthlyContributionPence}
      />
    </div>
  );
}
