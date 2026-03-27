import { createClient } from "@/lib/supabase/server";
import { computeProjections } from "@/lib/rae/projections";
import type { DebtAllocation } from "@/lib/rae/types";
import { ProjectionsPanel } from "../components/projections-panel";
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
  final_debt_allocations: DebtAllocation[] | null;
  executed_at: string;
};

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export default async function DebtPage() {
  const supabase = await createClient();

  const { data: household } = await supabase
    .from("household_profiles")
    .select("id, monthly_income, income_volatility, fixed_obligations, buffer_balance, plan_commitment_score")
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
    .order("apr", { ascending: false })
    .returns<DebtRow[]>();

  const { data: latestExecution } = await supabase
    .from("rae_executions")
    .select("final_debt_allocations, executed_at")
    .eq("household_id", household.id)
    .order("executed_at", { ascending: false })
    .limit(1)
    .maybeSingle<LatestExecution>();

  const debts = debtRows ?? [];
  const snapshot = buildHouseholdSnapshot(household, debts);

  const projections = computeProjections(snapshot);
  const allocations = latestExecution?.final_debt_allocations ?? [];
  const allocationByDebtId = new Map(allocations.map((allocation) => [allocation.debtId, allocation.amount]));
  const strategy =
    household.plan_commitment_score >= 0.6
      ? "Avalanche"
      : "Blended (70% avalanche / 30% snowball)";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-2xl font-semibold tracking-tight">Debt</h2>
        <p className="mt-2 text-sm text-zinc-600">Active debt stack in avalanche order with current Rail routing.</p>
        <div className="mt-4 space-y-3">
          {debts.length === 0 ? (
            <p className="text-sm text-zinc-600">No active debts.</p>
          ) : (
            debts.map((debt, index) => (
              <div key={debt.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-zinc-900">
                    {debt.label ?? debt.id} {debt.lender ? `(${debt.lender})` : ""}
                  </p>
                  {index === 0 ? (
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-800">
                      Target
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-zinc-700 md:grid-cols-4">
                  <p>Balance: {formatPounds(debt.balance)}</p>
                  <p>APR: {(debt.apr * 100).toFixed(1)}%</p>
                  <p>Minimum: {formatPounds(debt.min_payment)}</p>
                  <p>Extra: {formatPounds(allocationByDebtId.get(debt.id) ?? 0)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">Payoff projection</p>
        <p className="mt-2 text-sm text-zinc-700">
          Debt free in{" "}
          {projections.debtFreeMonth === null
            ? "more than 60 months"
            : projections.debtFreeMonth === 0
              ? "Month 0 (already clear)"
              : `Month ${projections.debtFreeMonth}`}
          . Interest saved vs minimums only: {formatPounds(projections.totalInterestSavedVsMinimum)}.
        </p>
        <div className="mt-4">
          <ProjectionsPanel
            debtFreeMonth={projections.debtFreeMonth}
            totalInterestSavedVsMinimum={projections.totalInterestSavedVsMinimum}
            monthlySnapshots={projections.monthlySnapshots}
          />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">Strategy</p>
        <p className="mt-2 text-sm text-zinc-700">{strategy}</p>
        <p className="mt-1 text-sm text-zinc-600">
          Rail uses the mathematically optimal sequence. As your follow-through score improves, strategy locks to
          pure avalanche.
        </p>
      </div>
    </div>
  );
}
