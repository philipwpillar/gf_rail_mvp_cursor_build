import { DEFAULT_RAE_CONFIG, PipelineStage, type AllocationVector } from "./types";

export interface ShockAdjustmentResult {
  finalAllocation: AllocationVector;
  shockApplied: boolean;
  shockFactor: number;
  shockRedirectAmount: number;
}

function cloneAllocation(allocation: AllocationVector): AllocationVector {
  return {
    bufferContribution: allocation.bufferContribution,
    investmentContribution: allocation.investmentContribution,
    debtAllocations: allocation.debtAllocations.map((d) => ({ ...d })),
  };
}

function sumDebtAllocations(allocation: AllocationVector): number {
  return allocation.debtAllocations.reduce((sum, d) => sum + d.amount, 0);
}

function rebalanceDebtAllocations(
  debtAllocations: AllocationVector["debtAllocations"],
  redirectAmount: number,
) {
  if (redirectAmount <= 0 || debtAllocations.length === 0) return;

  const total = debtAllocations.reduce((sum, d) => sum + d.amount, 0);
  if (total <= 0) return;

  let remainingRedirect = redirectAmount;
  for (let i = 0; i < debtAllocations.length; i++) {
    const isLast = i === debtAllocations.length - 1;
    const current = debtAllocations[i];
    const proportionalCut = isLast
      ? remainingRedirect
      : Math.min(current.amount, Math.round((current.amount / total) * redirectAmount));

    const appliedCut = Math.min(current.amount, proportionalCut);
    current.amount -= appliedCut;
    remainingRedirect -= appliedCut;
  }

  if (remainingRedirect > 0 && debtAllocations.length > 0) {
    const last = debtAllocations[debtAllocations.length - 1];
    const extraCut = Math.min(last.amount, remainingRedirect);
    last.amount -= extraCut;
  }
}

/**
 * phi = max(0, (pShock - threshold) / (1 - threshold))
 */
export function computeShockFactor(pShock: number, threshold: number): number {
  if (threshold >= 1) return 0;
  return Math.max(0, (pShock - threshold) / (1 - threshold));
}

export function applyShockAdjustment(
  allocation: AllocationVector,
  stage: PipelineStage,
  pShock: number,
): ShockAdjustmentResult {
  const threshold = DEFAULT_RAE_CONFIG.shockThreshold;

  if (pShock <= threshold) {
    return {
      finalAllocation: cloneAllocation(allocation),
      shockApplied: false,
      shockFactor: 0,
      shockRedirectAmount: 0,
    };
  }

  if (stage === PipelineStage.STAGE_1_RESILIENCE) {
    return {
      finalAllocation: cloneAllocation(allocation),
      shockApplied: false,
      shockFactor: 0,
      shockRedirectAmount: 0,
    };
  }

  const phi = computeShockFactor(pShock, threshold);
  const finalAllocation = cloneAllocation(allocation);

  if (stage === PipelineStage.STAGE_2_DEBT) {
    const debtPool = sumDebtAllocations(finalAllocation);
    const redirectCap = Math.round(debtPool * 0.5);
    const redirectAmount = Math.min(redirectCap, Math.round(debtPool * phi));

    rebalanceDebtAllocations(finalAllocation.debtAllocations, redirectAmount);
    finalAllocation.bufferContribution += redirectAmount;

    return {
      finalAllocation,
      shockApplied: redirectAmount > 0,
      shockFactor: phi,
      shockRedirectAmount: redirectAmount,
    };
  }

  const investmentPool = finalAllocation.investmentContribution;
  const redirectCap = Math.round(investmentPool * 0.5);
  const redirectAmount = Math.min(redirectCap, Math.round(investmentPool * phi));

  finalAllocation.investmentContribution -= redirectAmount;
  finalAllocation.bufferContribution += redirectAmount;

  return {
    finalAllocation,
    shockApplied: redirectAmount > 0,
    shockFactor: phi,
    shockRedirectAmount: redirectAmount,
  };
}

