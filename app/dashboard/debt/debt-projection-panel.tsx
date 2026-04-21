"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { computeProjections } from "@/lib/rae/projections";
import { runRAE } from "@/lib/rae/engine";
import { DEFAULT_POLICY } from "@/lib/rae/policy/defaults";
import type { HouseholdSnapshot } from "@/lib/rae/engine-types";
import type { DebtSnapshotRow } from "@/lib/server/snapshot-utils";
import { formatPounds } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProjectionsPanel } from "../components/projections-panel";

type DebtRow = DebtSnapshotRow;

type DebtProjectionPanelProps = {
  snapshot: HouseholdSnapshot;
  debts: DebtRow[];
};

const HOVER_CLOSE_DELAY_MS = 120;

function StrategyInfoPopover({ title, copy }: { title: string; copy: string }) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          clearCloseTimer();
          setOpen(false);
        }
      }}
      modal={false}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-current/80 hover:bg-white/15 hover:text-current"
          aria-label={`More about ${title} strategy`}
          onMouseEnter={() => {
            clearCloseTimer();
            setOpen(true);
          }}
          onMouseLeave={() => {
            clearCloseTimer();
            closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
          }}
          onClick={(event) => event.preventDefault()}
        >
          <Info className="size-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="max-w-md border border-zinc-200 bg-white p-4 text-zinc-900"
        onMouseEnter={() => {
          clearCloseTimer();
          setOpen(true);
        }}
        onMouseLeave={() => {
          clearCloseTimer();
          setOpen(false);
        }}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <p className="type-section-title text-zinc-900">Strategy</p>
        <p className="mt-2 type-body-strong text-zinc-700">{title}</p>
        <p className="mt-1 type-body text-zinc-600">{copy}</p>
      </PopoverContent>
    </Popover>
  );
}

export function DebtProjectionPanel({ snapshot, debts }: DebtProjectionPanelProps) {
  const [strategy, setStrategy] = useState<"avalanche" | "blended">(
    snapshot.planCommitmentScore >= 0.6 ? "avalanche" : "blended",
  );

  const adjustedSnapshot: HouseholdSnapshot = {
    ...snapshot,
    planCommitmentScore: strategy === "avalanche" ? 0.85 : 0.5,
  };
  const projections = computeProjections(adjustedSnapshot);
  const liveResult = runRAE(adjustedSnapshot, DEFAULT_POLICY);
  const liveAllocationByDebtId = new Map(
    liveResult.finalAllocation.debtAllocations.map((a) => [a.debtId, a.amount]),
  );
  const targetDebtId: string | null =
    liveResult.finalAllocation.debtAllocations.length > 0
      ? liveResult.finalAllocation.debtAllocations.reduce((max, a) =>
          a.amount > max.amount ? a : max,
        ).debtId
      : null;
  const strategyCopy =
    strategy === "blended"
      ? "Rail is routing 70% of surplus to your highest-rate debt and 30% to your smallest balance for behavioural momentum."
      : "Rail is routing 100% of surplus to your highest-rate debt — the mathematically optimal sequence.";
  const avalancheCopy =
    "Rail is routing 100% of surplus to your highest-rate debt — the mathematically optimal sequence.";
  const blendedCopy =
    "Rail is routing 70% of surplus to your highest-rate debt and 30% to your smallest balance for behavioural momentum.";

  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="type-section-title text-zinc-900">Payoff projection</p>
        <p className="mt-2 type-body text-zinc-700">
          Debt free in{" "}
          {projections.debtFreeMonth === null
            ? "more than 60 months"
            : projections.debtFreeMonth === 0
              ? "Month 0 (already clear)"
              : `Month ${projections.debtFreeMonth}`}
          .{" "}
          {projections.totalInterestSavedVsMinimum > 0
            ? `Interest saved vs minimums only: ${formatPounds(projections.totalInterestSavedVsMinimum)}.`
            : "Rail is prioritising index fund investment over accelerated loan repayment — interest saved on debt is £0 by design."}
        </p>

        <div className="mt-4">
          <div className="inline-flex rounded-lg bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setStrategy("avalanche")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 type-button ${
                strategy === "avalanche"
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              Avalanche
              <StrategyInfoPopover title="Avalanche" copy={avalancheCopy} />
            </button>
            <button
              type="button"
              onClick={() => setStrategy("blended")}
              className={`ml-2 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 type-button ${
                strategy === "blended" ? "bg-zinc-900 text-white" : "border border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              Blended (70 / 30)
              <StrategyInfoPopover title="Blended (70 / 30)" copy={blendedCopy} />
            </button>
          </div>
        </div>
        <p className="mt-2 type-caption text-zinc-600">{strategyCopy}</p>

        <div className="mt-4">
          <ProjectionsPanel
            debtFreeMonth={projections.debtFreeMonth}
            totalInterestSavedVsMinimum={projections.totalInterestSavedVsMinimum}
            monthlySnapshots={projections.monthlySnapshots}
            minimumOnlySnapshots={projections.minimumOnlySnapshots}
          />
        </div>
      </div>
      {debts.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="type-section-title text-zinc-900">Debt stack — current routing</p>
          <p className="mt-1 type-caption text-zinc-500">
            Extra payments update when you toggle strategy above.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="pb-2 text-left type-label text-zinc-500 font-medium">Debt</th>
                  <th className="pb-2 text-right type-label text-zinc-500 font-medium">Balance</th>
                  <th className="pb-2 text-right type-label text-zinc-500 font-medium">APR</th>
                  <th className="pb-2 text-right type-label text-zinc-500 font-medium">Minimum</th>
                  <th className="pb-2 text-right type-label text-zinc-500 font-medium">Rail extra</th>
                  <th className="pb-2 text-right type-label text-zinc-500 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((debt) => {
                  const extra = liveAllocationByDebtId.get(debt.id) ?? 0;
                  const total = debt.min_payment + extra;
                  return (
                    <tr key={debt.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="type-body text-zinc-900">{debt.label ?? debt.id}</span>
                          {debt.id === targetDebtId ? (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                              Target
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 text-right type-body text-zinc-700">
                        {formatPounds(debt.balance)}
                      </td>
                      <td className="py-3 text-right type-body text-zinc-700">
                        {(debt.apr * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 text-right type-body text-zinc-500">
                        {formatPounds(debt.min_payment)}
                      </td>
                      <td className="py-3 text-right type-body font-medium text-violet-700">
                        {extra > 0 ? `+${formatPounds(extra)}` : "—"}
                      </td>
                      <td className="py-3 text-right type-body font-medium text-zinc-900">
                        {formatPounds(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}
