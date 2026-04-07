"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { computeProjections } from "@/lib/rae/projections";
import type { DebtAllocation, HouseholdSnapshot } from "@/lib/rae/types";
import type { DebtSnapshotRow } from "@/lib/server/snapshot-utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

export function DebtProjectionPanel({ snapshot, allocations, debts }: DebtProjectionPanelProps) {
  const [strategy, setStrategy] = useState<"avalanche" | "blended">(
    snapshot.planCommitmentScore >= 0.6 ? "avalanche" : "blended",
  );

  const adjustedSnapshot: HouseholdSnapshot = {
    ...snapshot,
    planCommitmentScore: strategy === "avalanche" ? 0.85 : 0.5,
  };
  const projections = computeProjections(adjustedSnapshot);
  const strategyCopy =
    strategy === "blended"
      ? "Rail is routing 70% of surplus to your highest-rate debt and 30% to your smallest balance for behavioural momentum."
      : "Rail is routing 100% of surplus to your highest-rate debt — the mathematically optimal sequence.";
  const avalancheCopy =
    "Rail is routing 100% of surplus to your highest-rate debt — the mathematically optimal sequence.";
  const blendedCopy =
    "Rail is routing 70% of surplus to your highest-rate debt and 30% to your smallest balance for behavioural momentum.";

  void allocations;
  void debts;

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
          . Interest saved vs minimums only: {formatPounds(projections.totalInterestSavedVsMinimum)}.
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

    </>
  );
}
