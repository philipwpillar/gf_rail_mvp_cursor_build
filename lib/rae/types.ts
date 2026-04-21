export type DebtType = 'CARD' | 'LOAN' | 'BNPL' | 'OVERDRAFT' | 'OTHER';

export enum PipelineStage {
  STAGE_1_RESILIENCE = 'STAGE_1_RESILIENCE',
  STAGE_2_DEBT = 'STAGE_2_DEBT',
  STAGE_3_OWNERSHIP = 'STAGE_3_OWNERSHIP',
}

export interface DebtInstrument {
  id: string;
  label?: string;
  lender?: string | null;
  type: DebtType;
  balance: number;
  apr: number;
  minPayment: number;
  isActive: boolean;
}

export interface HouseholdSnapshot {
  monthlyIncome: number;
  incomeVolatility: number;
  fixedObligations: number;
  bufferBalance: number;
  planCommitmentScore: number;
  incomeShockProbability: number;
  debts: DebtInstrument[];
  /** ISO currency code, e.g. 'GBP' or 'USD'. Defaults to 'GBP' if absent. */
  currency?: string;
  /** ISO region code, e.g. 'GB' or 'US'. Defaults to 'GB' if absent. */
  region?: string;
}

export interface DebtAllocation {
  debtId: string;
  amount: number;
}

export interface AllocationVector {
  bufferContribution: number;
  investmentContribution: number;
  debtAllocations: DebtAllocation[];
}

/**
 * Phase 0A result contract.
 *
 * When obligationStress is true (S <= 0), callers can treat this as "no allocation produced":
 * - baseAllocation and finalAllocation must be zero/empty vectors
 * - rationale should explain the stress condition
 */
export interface RAEResult {
  surplus: number;
  obligationStress: boolean;
  stage: PipelineStage;
  bMin: number;
  bTarget: number;
  baseAllocation: AllocationVector;
  finalAllocation: AllocationVector;
  pShockUsed: number;
  shockApplied: boolean;
  shockFactor: number | null;
  shockRedirectAmount: number | null;
  rationale: string;
}

export interface RAEConfig {
  aprThreshold: number;
  shockThreshold: number;
  bMinWeeks: number;
  bTargetWeeks: number;
  fragilityLambda: number;
}

export const DEFAULT_RAE_CONFIG: RAEConfig = {
  aprThreshold: 0.07,
  shockThreshold: 0.25,
  bMinWeeks: 3,
  bTargetWeeks: 6,
  fragilityLambda: 1.5, // weight applied to shock-period losses; > 1.0 reflects that a plan-breaking shock costs more than its nominal pound value
};
