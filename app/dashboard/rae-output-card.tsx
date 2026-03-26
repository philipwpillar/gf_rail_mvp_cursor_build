"use client";

import { useEffect, useState } from "react";
import { PipelineStage, type RAEResult } from "@/lib/rae/types";

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

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

export function RaeOutputCard() {
  const [result, setResult] = useState<RAEResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRaeResult() {
      try {
        const response = await fetch("/api/rae", { method: "GET" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load RAE result.");
        }

        if (isMounted) {
          setResult(payload.result as RAEResult);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load RAE result.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRaeResult();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        RAE output (Stage 6 API wiring)
      </p>

      {isLoading ? (
        <p className="mt-2 text-sm text-zinc-700">Loading allocation recommendation...</p>
      ) : null}

      {!isLoading && error ? (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && result ? (
        <div className="mt-2 space-y-2 text-sm text-zinc-800">
          <p>
            <span className="font-medium">Stage:</span> {stageLabel(result.stage)}
          </p>
          <p>
            <span className="font-medium">Surplus:</span> {formatPounds(result.surplus)}
          </p>
          <p>
            <span className="font-medium">B_min / B_target:</span> {formatPounds(result.bMin)} /{" "}
            {formatPounds(result.bTarget)}
          </p>
          <p>
            <span className="font-medium">Buffer contribution:</span>{" "}
            {formatPounds(result.finalAllocation.bufferContribution)}
          </p>
          <p>
            <span className="font-medium">Debt contribution:</span>{" "}
            {formatPounds(debtTotal(result))}
          </p>
          <p>
            <span className="font-medium">Investment contribution:</span>{" "}
            {formatPounds(result.finalAllocation.investmentContribution)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
