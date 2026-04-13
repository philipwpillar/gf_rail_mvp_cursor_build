"use client";

import { useState } from "react";
import { PipelineStage, type RAEResult } from "@/lib/rae/types";
import { AllocationChart } from "./components/allocation-chart";
import { DebtRoutingCard } from "./components/debt-routing-card";
import { ProjectionsPanel } from "./components/projections-panel";
import type { RaeApiPayload } from "@/lib/server/rae-recommendation";
import { formatPounds } from "@/lib/utils";
import { captureEvent } from "@/lib/analytics";

function stageLabel(stage: PipelineStage): string {
  switch (stage) {
    case PipelineStage.STAGE_1_RESILIENCE:
      return "Stage 1 - Building Safety Net";
    case PipelineStage.STAGE_2_DEBT:
      return "Stage 2 - Eliminating Debt";
    case PipelineStage.STAGE_3_OWNERSHIP:
      return "Stage 3 - Building Ownership";
    default:
      return stage;
  }
}

function debtTotal(result: RAEResult): number {
  return result.finalAllocation.debtAllocations.reduce((sum, d) => sum + d.amount, 0);
}

type ApiContext = {
  householdName: string;
  debts: {
    id: string;
    label: string;
    apr: number;
    balance: number;
    minPayment: number;
    isActive: boolean;
  }[];
};

function stageTone(stage: PipelineStage): string {
  if (stage === PipelineStage.STAGE_1_RESILIENCE) return "bg-amber-100 text-amber-800";
  if (stage === PipelineStage.STAGE_2_DEBT) return "bg-rose-100 text-rose-800";
  return "bg-emerald-100 text-emerald-800";
}

type RaeOutputCardProps = {
  initialPayload: RaeApiPayload | null;
  initialError: string | null;
};

export function RaeOutputCard({ initialPayload, initialError }: RaeOutputCardProps) {
  const [isDownloadingPlan, setIsDownloadingPlan] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const result: RAEResult | null = initialPayload?.result ?? null;
  const projections = initialPayload?.projections ?? null;
  const context: ApiContext | null = initialPayload?.context ?? null;
  const error: string | null = initialError;

  async function handleDownloadPlan() {
    setDownloadError(null);
    setIsDownloadingPlan(true);
    try {
      const response = await fetch("/api/plan-pdf", { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to generate plan PDF. Please try again.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "rail-plan-summary.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      captureEvent("plan_downloaded");
    } catch (downloadErr) {
      setDownloadError(
        downloadErr instanceof Error
          ? downloadErr.message
          : "Failed to generate plan PDF. Please try again.",
      );
    } finally {
      setIsDownloadingPlan(false);
    }
  }

  const chartData =
    !result
      ? []
      : [
          { name: "Buffer", value: result.finalAllocation.bufferContribution, fill: "#0ea5e9" },
          { name: "Debt", value: debtTotal(result), fill: "#8b5cf6" },
          {
            name: "Investment",
            value: result.finalAllocation.investmentContribution,
            fill: "#22c55e",
          },
        ].filter((item) => item.value > 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="type-h1">Your financial plan</h2>
                <p className="mt-1 type-body text-zinc-600">
                  Based on your household profile. Updated each time you visit.
                </p>
              </div>
              {result ? (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageTone(result.stage)}`}>
                  {stageLabel(result.stage)}
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => void handleDownloadPlan()}
                disabled={isDownloadingPlan || !result}
                className="h-9 rounded-md border border-zinc-200 bg-white px-4 type-button text-zinc-700 disabled:opacity-50"
              >
                {isDownloadingPlan ? "Preparing PDF..." : "Download Plan"}
              </button>
            </div>

            <div className="mt-5 border-b border-zinc-200">
              <div className="flex items-center justify-between gap-4 text-sm">
                <div className="border-b-2 border-blue-500 pb-2 font-medium text-blue-600">
                  Allocation Plan
                </div>
                <div className="pb-2 type-caption text-zinc-500">More views coming soon</div>
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 type-body text-red-700">
                {error}
              </div>
            ) : null}
            {downloadError ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 type-body text-red-700">
                {downloadError}
              </div>
            ) : null}

            {!error && result ? (
              <div className="mt-6 space-y-5">
                {initialPayload?.meta.profileBootstrapped ? (
                  <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 type-body text-blue-800">
                    We initialized your household profile with starter values. Add your real income,
                    obligations, and debts to receive a personalized recommendation.
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="type-label text-zinc-500">Monthly Surplus</p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-900">
                      {formatPounds(result.surplus)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="type-label text-zinc-500">Current Buffer Floor</p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-900">{formatPounds(result.bMin)}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="type-label text-zinc-500">Target Buffer</p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-900">
                      {formatPounds(result.bTarget)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="type-section-title text-zinc-900">Income Allocation Plan (This Month)</p>
                  <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs text-blue-700">Buffer Contribution</p>
                        <p className="mt-2 text-xl font-semibold text-blue-900">
                          {formatPounds(result.finalAllocation.bufferContribution)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                        <p className="text-xs text-violet-700">Debt Contribution</p>
                        <p className="mt-2 text-xl font-semibold text-violet-900">
                          {formatPounds(debtTotal(result))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs text-emerald-700">Investment Contribution</p>
                        <p className="mt-2 text-xl font-semibold text-emerald-900">
                          {formatPounds(result.finalAllocation.investmentContribution)}
                        </p>
                      </div>
                    </div>
                    <AllocationChart data={chartData} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <DebtRoutingCard
                    allocations={result.finalAllocation.debtAllocations}
                    debts={context?.debts ?? []}
                  />

                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <p className="type-section-title text-zinc-900">Risk & Rationale</p>
                    <div className="mt-3 space-y-2 type-body text-zinc-700">
                      <p>
                        <span className="font-medium">Shock adjustment:</span>{" "}
                        {result.shockApplied ? "Applied" : "Not applied"}
                      </p>
                      <p>
                        <span className="font-medium">Shock factor:</span>{" "}
                        {result.shockFactor === null ? "N/A" : result.shockFactor.toFixed(2)}
                      </p>
                      <p>
                        <span className="font-medium">Redirected amount:</span>{" "}
                        {result.shockRedirectAmount === null
                          ? "N/A"
                          : formatPounds(result.shockRedirectAmount)}
                      </p>
                      <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-zinc-700">
                        {result.rationale}
                      </p>
                    </div>
                  </div>
                </div>

                {projections ? (
                  <ProjectionsPanel
                    debtFreeMonth={projections.debtFreeMonth}
                    totalInterestSavedVsMinimum={projections.totalInterestSavedVsMinimum}
                    monthlySnapshots={projections.monthlySnapshots}
                    minimumOnlySnapshots={projections.minimumOnlySnapshots}
                  />
                ) : null}
              </div>
            ) : null}
    </div>
  );
}
