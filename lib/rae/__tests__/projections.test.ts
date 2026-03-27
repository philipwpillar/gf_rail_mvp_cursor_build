import { computeProjections } from "@/lib/rae/projections";
import type { HouseholdSnapshot } from "@/lib/rae/types";

describe("computeProjections", () => {
  it("projects Sarah & James to debt freedom and positive interest savings", () => {
    const snapshot: HouseholdSnapshot = {
      monthlyIncome: 280_000,
      incomeVolatility: 0,
      fixedObligations: 225_500,
      bufferBalance: 90_000,
      planCommitmentScore: 0.5,
      incomeShockProbability: 0,
      debts: [
        {
          id: "card-a",
          type: "CARD",
          balance: 210_000,
          apr: 0.349,
          minPayment: 4_200,
          isActive: true,
          label: "Credit Card A (Barclaycard)",
          lender: "Barclaycard",
        },
        {
          id: "card-b",
          type: "CARD",
          balance: 190_000,
          apr: 0.225,
          minPayment: 3_800,
          isActive: true,
          label: "Credit Card B (HSBC)",
          lender: "HSBC",
        },
        {
          id: "loan-a",
          type: "LOAN",
          balance: 120_000,
          apr: 0.128,
          minPayment: 2_500,
          isActive: true,
          label: "Personal Loan (Nationwide)",
          lender: "Nationwide",
        },
      ],
    };

    const result = computeProjections(snapshot);

    expect(result.monthlySnapshots).toHaveLength(60);
    expect(result.debtFreeMonth).not.toBeNull();
    expect(result.debtFreeMonth).toBeGreaterThanOrEqual(10);
    expect(result.debtFreeMonth).toBeLessThanOrEqual(20);
    expect(result.totalInterestSavedVsMinimum).toBeGreaterThan(0);
  });

  it("projects Mark & Lisa to debt freedom within horizon and strong investing", () => {
    const snapshot: HouseholdSnapshot = {
      monthlyIncome: 320_000,
      incomeVolatility: 0,
      fixedObligations: 250_000,
      bufferBalance: 346_000,
      planCommitmentScore: 0.85,
      incomeShockProbability: 0,
      debts: [
        {
          id: "car-loan",
          type: "LOAN",
          balance: 420_000,
          apr: 0.059,
          minPayment: 9_500,
          isActive: true,
          label: "Car Loan (Lloyds)",
          lender: "Lloyds",
        },
      ],
    };

    const result = computeProjections(snapshot);

    expect(result.monthlySnapshots).toHaveLength(60);
    expect(result.debtFreeMonth).not.toBeNull();
    expect(result.debtFreeMonth).toBeLessThanOrEqual(60);
    expect(result.monthlySnapshots[59].investmentValue).toBeGreaterThan(1_000_000);
  });
});
