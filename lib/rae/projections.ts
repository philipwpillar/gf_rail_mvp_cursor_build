import { runRAE } from "./engine";
import type { DebtInstrument, HouseholdSnapshot } from "./types";

export interface MonthlySnapshot {
  month: number;
  bufferBalance: number;
  totalDebt: number;
  investmentValue: number;
  surplusAllocated: number;
}

export interface ProjectionResult {
  debtFreeMonth: number | null;
  totalInterestPaid: number;
  totalInterestSavedVsMinimum: number;
  monthlySnapshots: MonthlySnapshot[];
}

const PROJECTION_MONTHS = 60;

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
  const postPayment = Math.max(0, debt.balance - payment);
  const interestAccrued = Math.round(postPayment * (debt.apr / 12));
  const nextBalance = postPayment + interestAccrued;
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

function computeMinimumOnlyInterest(snapshot: HouseholdSnapshot): number {
  let baseline = cloneSnapshot(snapshot);
  let totalInterest = 0;

  for (let month = 1; month <= PROJECTION_MONTHS; month += 1) {
    const nextDebts = baseline.debts.map((debt) => {
      const { nextDebt, interestPaid } = applyMonthToDebt(debt, 0);
      totalInterest += interestPaid;
      return nextDebt;
    });
    baseline = { ...baseline, debts: nextDebts };
  }

  return totalInterest;
}

export function computeProjections(snapshot: HouseholdSnapshot): ProjectionResult {
  let projected = cloneSnapshot(snapshot);
  let debtFreeMonth: number | null = totalDebtBalance(projected.debts) === 0 ? 0 : null;
  let totalInterestPaid = 0;
  let investmentValue = 0;
  const monthlySnapshots: MonthlySnapshot[] = [];

  for (let month = 1; month <= PROJECTION_MONTHS; month += 1) {
    const result = runRAE(projected);
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
    investmentValue += allocation.investmentContribution;
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

  const baselineInterest = computeMinimumOnlyInterest(snapshot);
  // TODO: Phase 0B should model investment compounding assumptions explicitly.
  return {
    debtFreeMonth,
    totalInterestPaid,
    totalInterestSavedVsMinimum: baselineInterest - totalInterestPaid,
    monthlySnapshots,
  };
}
