"use client";

import { useState } from "react";
import { computeProjections } from "@/lib/rae/projections";
import type { DebtAllocation, HouseholdSnapshot } from "@/lib/rae/types";
import type { DebtSnapshotRow } from "@/lib/server/snapshot-utils";
import { ProjectionsPanel } from "../components/projections-panel";

type DebtRow = DebtSnapshotRow;

type DebtProjectionPanelProps = {
  snapshot: HouseholdSnapshot;
  allocations: DebtAllocation[];
  debts: DebtRow[];
};

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function DebtProjectionPanel({ snapshot, allocations, debts }: DebtProjectionPanelProps) {
  const [strategy, setStrategy] = useState<"avalanche" | "blended">(
    snapshot.planCommitmentScore >= 0.6 ? "avalanche" : "blended",
  );

  const adjustedSnapshot: HouseholdSnapshot = {
    ...snapshot,
    planCommitmentScore: strategy === "avalanche" ? 0.85 : 0.5,
  };
  const projections = computeProjections(adjustedSnapshot);
  const strategyLabel = strategy === "avalanche" ? "Avalanche" : "Blended (70% avalanche / 30% snowball)";
  const strategyCopy =
    strategy === "blended"
      ? "Rail is routing 70% of surplus to your highest-rate debt and 30% to your smallest balance for behavioural momentum."
      : "Rail is routing 100% of surplus to your highest-rate debt — the mathematically optimal sequence.";

  void allocations;
  void debts;

  return (
    <>
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

        <div className="mt-4 inline-flex rounded-lg bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => setStrategy("avalanche")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              strategy === "avalanche"
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            Avalanche
          </button>
          <button
            type="button"
            onClick={() => setStrategy("blended")}
            className={`ml-2 rounded-md px-3 py-1.5 text-sm font-medium ${
              strategy === "blended" ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            Blended (70 / 30)
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-600">{strategyCopy}</p>

        <div className="mt-4">
          <ProjectionsPanel
            debtFreeMonth={projections.debtFreeMonth}
            totalInterestSavedVsMinimum={projections.totalInterestSavedVsMinimum}
            monthlySnapshots={projections.monthlySnapshots}
            minimumOnlySnapshots={projections.minimumOnlySnapshots}
          />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-semibold text-zinc-900">Strategy</p>
        <p className="mt-2 text-sm text-zinc-700">{strategyLabel}</p>
        <p className="mt-1 text-sm text-zinc-600">{strategyCopy}</p>
      </div>
    </>
  );
}
