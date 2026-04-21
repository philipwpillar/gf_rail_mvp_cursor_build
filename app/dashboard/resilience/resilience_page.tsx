import { createClient } from "@/lib/supabase/server";
import { applySurplusDelta, parseSurplusDeltaCookie } from "@/lib/server/scenario";
import { cookies } from "next/headers";
import { runRAE } from "@/lib/rae/engine";
import { DEFAULT_POLICY } from "@/lib/rae/policy/defaults";
import { buildHouseholdSnapshot, type DebtSnapshotRow } from "@/lib/server/snapshot-utils";
import { formatPounds } from "@/lib/utils";

export const dynamic = "force-dynamic";

type HouseholdRow = {
  id: string;
  buffer_balance: number;
  fixed_obligations: number;
  monthly_income: number;
  income_volatility: number;
  plan_commitment_score: number;
};

type DebtRow = DebtSnapshotRow;

type LatestExecution = {
  b_min: number;
  b_target: number;
  final_buffer_contribution: number;
  executed_at: string;
};

export default async function ResiliencePage() {
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
    .select(
      "id, buffer_balance, fixed_obligations, monthly_income, income_volatility, plan_commitment_score",
    )
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
    .returns<DebtRow[]>();

  const { data: latestExecution } = await supabase
    .from("rae_executions")
    .select("b_min, b_target, final_buffer_contribution, executed_at")
    .eq("household_id", household.id)
    .order("executed_at", { ascending: false })
    .limit(1)
    .maybeSingle<LatestExecution>();

  const adjustedMonthlyIncome = applySurplusDelta(household.monthly_income, surplusDeltaPence);

  const activeDebtMin = (debtRows ?? [])
    .filter((debt) => debt.is_active)
    .reduce((sum, debt) => sum + debt.min_payment, 0);
  const snapshot = buildHouseholdSnapshot(
    {
      ...household,
      monthly_income: adjustedMonthlyIncome,
    },
    debtRows ?? [],
  );
  const scenarioResult = runRAE(snapshot, DEFAULT_POLICY);

  const weeklyObligations = (household.fixed_obligations + activeDebtMin) / 4.33;
  const weeksCovered = weeklyObligations > 0 ? household.buffer_balance / weeklyObligations : 0;

  const fallbackBMin = Math.round(weeklyObligations * 3);
  const fallbackBTarget = Math.round(weeklyObligations * 6);
  const bMin = scenarioResult.bMin || latestExecution?.b_min || fallbackBMin;
  const bTarget = scenarioResult.bTarget || latestExecution?.b_target || fallbackBTarget;
  const currentBuffer = household.buffer_balance;
  const progress = bTarget > 0 ? Math.min(100, (currentBuffer / bTarget) * 100) : 0;

  const status =
    currentBuffer < bMin
      ? { label: "Below minimum", tone: "bg-red-100 text-red-800" }
      : currentBuffer < bTarget
        ? { label: "Safe", tone: "bg-amber-100 text-amber-800" }
        : { label: "Fully funded", tone: "bg-emerald-100 text-emerald-800" };
  const monthlyBufferContribution = scenarioResult.finalAllocation.bufferContribution;
  const monthsToFunded: number | null =
    currentBuffer >= bTarget
      ? 0
      : monthlyBufferContribution > 0
        ? Math.ceil((bTarget - currentBuffer) / monthlyBufferContribution)
        : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="type-h1">Resilience</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="type-label text-zinc-500">Current buffer</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{formatPounds(currentBuffer)}</p>
            <p className="mt-2 type-body text-zinc-600">
              Your safety net covers {weeksCovered.toFixed(1)} weeks of essential expenses.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="type-label text-zinc-500">Buffer progress</p>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-200">
              <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex justify-between type-caption text-zinc-600">
              <span>B_min {formatPounds(bMin)}</span>
              <span>B_target {formatPounds(bTarget)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="type-section-title text-zinc-900">This month&apos;s buffer contribution</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {formatPounds(
              scenarioResult.finalAllocation.bufferContribution ||
                latestExecution?.final_buffer_contribution ||
                0,
            )}
          </p>
          <p className="mt-2 type-body text-zinc-600">
            Rail is adding{" "}
            {formatPounds(
              scenarioResult.finalAllocation.bufferContribution ||
                latestExecution?.final_buffer_contribution ||
                0,
            )}{" "}
            to your buffer this month.
          </p>
          {currentBuffer >= bTarget ? (
            <p className="mt-2 type-body text-zinc-600">
              Your buffer is fully funded. Surplus is now redirected to debt elimination.
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="type-section-title text-zinc-900">What your buffer covers</p>
          <p className="mt-2 type-body text-zinc-600">
            At your current obligations of {formatPounds(Math.round(weeklyObligations))}/week,
            your buffer covers {weeksCovered.toFixed(1)} weeks of essential expenses.
          </p>
          {monthsToFunded === 0 ? (
            <p className="mt-3 type-body text-emerald-700 font-medium">Buffer fully funded.</p>
          ) : monthsToFunded !== null ? (
            <p className="mt-3 type-body text-zinc-700">
              At{" "}
              <span className="font-medium">{formatPounds(monthlyBufferContribution)}/month</span>,
              your buffer will be fully funded in{" "}
              <span className="font-medium">
                {monthsToFunded} month{monthsToFunded === 1 ? "" : "s"}
              </span>
              .
            </p>
          ) : (
            <p className="mt-3 type-body text-zinc-500">
              No buffer contribution this cycle — surplus is fully allocated to debt.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
