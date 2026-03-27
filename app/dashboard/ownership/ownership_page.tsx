import { createClient } from "@/lib/supabase/server";
import { computeProjections } from "@/lib/rae/projections";
import { PipelineStage } from "@/lib/rae/types";
import { buildHouseholdSnapshot, type DebtSnapshotRow } from "@/lib/server/snapshot-utils";

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

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export default async function OwnershipPage() {
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
  const snapshot = buildHouseholdSnapshot(household, debts);

  const projections = computeProjections(snapshot);
  const projectedPot = projections.monthlySnapshots[59]?.investmentValue ?? 0;
  const stage = latestExecution?.stage;
  const isOwnershipActive = stage === PipelineStage.STAGE_3_OWNERSHIP;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-2xl font-semibold tracking-tight">Ownership</h2>
        {!isOwnershipActive ? (
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            <p className="font-medium">Not yet active</p>
            <p>Once your buffer is funded and high-rate debt is cleared, your surplus flows here.</p>
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
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            <p className="font-medium">
              Investing {formatPounds(latestExecution?.final_investment_contribution ?? 0)} this month
            </p>
            <p>
              Buffer target ({formatPounds(latestExecution?.b_target ?? 0)}) is met and ownership phase is active.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">Projected pot in 5 years</p>
        <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatPounds(projectedPot)}</p>
        {/* TODO: Phase 0B — add compound growth at 7% p.a. nominal. Currently simple accumulation only. */}
        <p className="mt-2 text-sm text-zinc-600">
          Index funds only. No active management. Low fees. Long time horizon.
        </p>
      </div>
    </div>
  );
}
