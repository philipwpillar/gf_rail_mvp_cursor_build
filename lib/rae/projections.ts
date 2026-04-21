import { runRAE } from "./engine";
import { DEFAULT_POLICY } from "./policy/defaults";
import type { DebtInstrument, HouseholdSnapshot } from "./engine-types";

export interface MonthlySnapshot {
  month: number;
  bufferBalance: number;
  totalDebt: number;
  investmentValue: number;
  surplusAllocated: number;
}

export interface MinimumOnlyMonthlySnapshot {
  month: number;
  totalDebt: number;
}

export interface ProjectionResult {
  debtFreeMonth: number | null;
  totalInterestPaid: number;
  totalInterestSavedVsMinimum: number;
  monthlySnapshots: MonthlySnapshot[];
  minimumOnlySnapshots: MinimumOnlyMonthlySnapshot[];
}

const PROJECTION_MONTHS = 60;
// Nominal annual growth rate for index fund projection (Phase 0A assumption).
const ANNUAL_GROWTH_RATE = 0.07;
const MONTHLY_GROWTH_RATE = ANNUAL_GROWTH_RATE / 12;

function cloneSnapshot(snapshot: HouseholdSnapshot): HouseholdSnapshot {
  return {
    ...snapshot,
    debts: snapshot.debts.map((debt) => ({ ...debt })),
  };
}

function totalDebtBalance(debts: DebtInstrument[]): number {
  return debts.filter((debt) => debt.isActive).reduce((sum, debt) => sum + debt.balance, 0);
}

function applyMonthToDebt(
  debt: DebtInstrument,
  extraAllocation: number,
): { nextDebt: DebtInstrument; interestPaid: number } {
  if (!debt.isActive || debt.balance <= 0) {
    return {
      nextDebt: { ...debt, balance: 0, isActive: false },
      interestPaid: 0,
    };
  }

  const payment = debt.minPayment + extraAllocation;
  const interestAccrued = Math.round(debt.balance * (debt.apr / 12));
  const nextBalance = Math.round(Math.max(0, debt.balance + interestAccrued - payment));
  const isActive = nextBalance > 0;

  return {
    nextDebt: {
      ...debt,
      balance: nextBalance,
      isActive,
    },
    interestPaid: interestAccrued,
  };
}

function computeMinimumOnlyInterest(snapshot: HouseholdSnapshot): {
  totalInterest: number;
  monthlySnapshots: MinimumOnlyMonthlySnapshot[];
} {
  let baseline = cloneSnapshot(snapshot);
  let totalInterest = 0;
  const monthlySnapshots: MinimumOnlyMonthlySnapshot[] = [];

  for (let month = 1; month <= PROJECTION_MONTHS; month += 1) {
    const nextDebts = baseline.debts.map((debt) => {
      const { nextDebt, interestPaid } = applyMonthToDebt(debt, 0);
      totalInterest += interestPaid;
      return nextDebt;
    });
    const totalDebt = totalDebtBalance(nextDebts);
    monthlySnapshots.push({
      month,
      totalDebt,
    });
    baseline = { ...baseline, debts: nextDebts };
  }

  return { totalInterest, monthlySnapshots };
}

export function computeProjections(snapshot: HouseholdSnapshot): ProjectionResult {
  let projected = cloneSnapshot(snapshot);
  let debtFreeMonth: number | null = totalDebtBalance(projected.debts) === 0 ? 0 : null;
  let totalInterestPaid = 0;
  let investmentValue = 0;
  const monthlySnapshots: MonthlySnapshot[] = [];

  for (let month = 1; month <= PROJECTION_MONTHS; month += 1) {
    const result = runRAE(projected, DEFAULT_POLICY);
    const allocation = result.finalAllocation;

    const debtAllocationById = new Map(
      allocation.debtAllocations.map((debtAllocation) => [debtAllocation.debtId, debtAllocation.amount]),
    );

    const nextDebts = projected.debts.map((debt) => {
      const extraAllocation = debtAllocationById.get(debt.id) ?? 0;
      const { nextDebt, interestPaid } = applyMonthToDebt(debt, extraAllocation);
      totalInterestPaid += interestPaid;
      return nextDebt;
    });

    const nextBufferBalance = projected.bufferBalance + allocation.bufferContribution;
    investmentValue = investmentValue * (1 + MONTHLY_GROWTH_RATE) + allocation.investmentContribution;
    const totalDebt = totalDebtBalance(nextDebts);
    const surplusAllocated =
      allocation.bufferContribution +
      allocation.investmentContribution +
      allocation.debtAllocations.reduce((sum, debt) => sum + debt.amount, 0);

    if (debtFreeMonth === null && totalDebt === 0) {
      debtFreeMonth = month;
    }

    monthlySnapshots.push({
      month,
      bufferBalance: nextBufferBalance,
      totalDebt,
      investmentValue,
      surplusAllocated,
    });

    projected = {
      ...projected,
      bufferBalance: nextBufferBalance,
      debts: nextDebts,
    };
  }

  const { totalInterest: baselineInterest, monthlySnapshots: minimumOnlySnapshots } =
    computeMinimumOnlyInterest(snapshot);
  return {
    debtFreeMonth,
    totalInterestPaid,
    totalInterestSavedVsMinimum: baselineInterest - totalInterestPaid,
    monthlySnapshots,
    minimumOnlySnapshots,
  };
}
