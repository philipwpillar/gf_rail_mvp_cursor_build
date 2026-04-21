import { runRAE } from "@/lib/rae/engine";
import { DEFAULT_POLICY } from "@/lib/rae/policy/defaults";
import { PipelineStage, type HouseholdSnapshot } from "@/lib/rae/types";

describe("runRAE seeded households", () => {
  it("matches Sarah & James Stage 1 allocation", () => {
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

    const result = runRAE(snapshot, DEFAULT_POLICY);

    expect(result.obligationStress).toBe(false);
    expect(result.stage).toBe(PipelineStage.STAGE_1_RESILIENCE);
    expect(result.surplus).toBe(44_000);
    expect(result.bMin).toBe(163_510);
    expect(result.bTarget).toBe(327_021);
    expect(result.baseAllocation).toEqual({
      bufferContribution: 44_000,
      investmentContribution: 0,
      debtAllocations: [],
    });
    expect(result.finalAllocation).toEqual(result.baseAllocation);
    expect(result.shockApplied).toBe(false);
    expect(result.shockFactor).toBeNull();
    expect(result.shockRedirectAmount).toBeNull();
  });

  it("matches Mark & Lisa Stage 3 allocation", () => {
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

    const result = runRAE(snapshot, DEFAULT_POLICY);

    expect(result.obligationStress).toBe(false);
    expect(result.stage).toBe(PipelineStage.STAGE_3_OWNERSHIP);
    expect(result.surplus).toBe(60_500);
    expect(result.bMin).toBe(179_792);
    expect(result.bTarget).toBe(359_584);
    expect(result.baseAllocation).toEqual({
      bufferContribution: 13_584,
      investmentContribution: 46_916,
      debtAllocations: [],
    });
    expect(result.finalAllocation).toEqual(result.baseAllocation);
    expect(result.shockApplied).toBe(false);
    expect(result.shockFactor).toBeNull();
    expect(result.shockRedirectAmount).toBeNull();
  });
});
