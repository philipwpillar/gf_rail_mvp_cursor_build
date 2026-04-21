import {
  PipelineStage,
  type AllocationVector,
  type HouseholdSnapshot,
  type RAEResult,
} from "./types";
import { computeSurplus } from "./surplus";
import { classifyStage, computeBMin, computeBTarget } from "./classifier";
import { computeBaseAllocation, zeroAllocation } from "./allocator";
import { applyShockAdjustment } from "./shock";

function formatMoneySafe(pence: number, currency?: string): string {
  const symbol = currency === "USD" ? "$" : "£";
  return `${symbol}${(pence / 100).toFixed(2)}`;
}

function stageLabel(stage: PipelineStage): string {
  switch (stage) {
    case PipelineStage.STAGE_1_RESILIENCE:
      return "Building Safety Net";
    case PipelineStage.STAGE_2_DEBT:
      return "Eliminating Debt";
    case PipelineStage.STAGE_3_OWNERSHIP:
      return "Building Ownership";
    default:
      return stage;
  }
}

function buildRationale(
  stage: PipelineStage,
  snapshot: HouseholdSnapshot,
  surplus: number,
  baseAllocation: AllocationVector,
  shockApplied: boolean,
  shockRedirectAmount: number,
): string {
  const parts: string[] = [];

  parts.push(
    `Current stage: ${stageLabel(stage)}. Available monthly surplus is ${formatMoneySafe(surplus, snapshot.currency)}.`,
  );

  const debtTotal = baseAllocation.debtAllocations.reduce((sum, d) => sum + d.amount, 0);
  if (baseAllocation.bufferContribution > 0) {
    parts.push(`Buffer allocation: ${formatMoneySafe(baseAllocation.bufferContribution, snapshot.currency)}.`);
  }
  if (debtTotal > 0) {
    parts.push(`Debt allocation: ${formatMoneySafe(debtTotal, snapshot.currency)}.`);
  }
  if (baseAllocation.investmentContribution > 0) {
    parts.push(`Investment allocation: ${formatMoneySafe(baseAllocation.investmentContribution, snapshot.currency)}.`);
  }
  if (
    baseAllocation.bufferContribution === 0 &&
    debtTotal === 0 &&
    baseAllocation.investmentContribution === 0
  ) {
    parts.push("No positive allocation is available this cycle.");
  }

  if (shockApplied && shockRedirectAmount > 0) {
    parts.push(
      `Income-shock risk is elevated; ${formatMoneySafe(
        shockRedirectAmount,
        snapshot.currency,
      )} was redirected to buffer protection.`,
    );
  }

  return parts.join(" ");
}

export function runRAE(snapshot: HouseholdSnapshot): RAEResult {
  const { surplus, obligationStress } = computeSurplus(snapshot);
  const bMin = computeBMin(snapshot);
  const bTarget = computeBTarget(snapshot);

  if (obligationStress) {
    const zero = zeroAllocation();
    return {
      surplus,
      obligationStress: true,
      stage: PipelineStage.STAGE_1_RESILIENCE,
      bMin,
      bTarget,
      baseAllocation: zero,
      finalAllocation: zero,
      pShockUsed: snapshot.incomeShockProbability,
      shockApplied: false,
      shockFactor: null,
      shockRedirectAmount: null,
      rationale:
        "Your fixed obligations and minimum debt payments exceed your monthly income. No allocation is possible until this is resolved.",
    };
  }

  const stage = classifyStage(snapshot, bMin);
  const baseAllocation = computeBaseAllocation(stage, surplus, snapshot, bMin, bTarget);
  const shockResult = applyShockAdjustment(
    baseAllocation,
    stage,
    snapshot.incomeShockProbability,
  );

  return {
    surplus,
    obligationStress: false,
    stage,
    bMin,
    bTarget,
    baseAllocation,
    finalAllocation: shockResult.finalAllocation,
    pShockUsed: snapshot.incomeShockProbability,
    shockApplied: shockResult.shockApplied,
    shockFactor: shockResult.shockApplied ? shockResult.shockFactor : null,
    shockRedirectAmount: shockResult.shockApplied ? shockResult.shockRedirectAmount : null,
    rationale: buildRationale(
      stage,
      snapshot,
      surplus,
      baseAllocation,
      shockResult.shockApplied,
      shockResult.shockRedirectAmount,
    ),
  };
}

