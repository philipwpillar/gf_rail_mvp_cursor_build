"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FundSelector } from "@/components/ownership/FundSelector";
import { ProjectionChart } from "@/components/ownership/ProjectionChart";
import { formatMoney } from "@/lib/display/money";

type OwnershipClientProps = {
  monthlyContributionPence: number;
  projectedMonthlyContributionPence: number;
};

const FUNDS = {
  "global-40": { label: "LifeStrategy® Global 40%", annualReturn: 0.045, colour: "#6366f1" },
  "global-60": { label: "LifeStrategy® Global 60%", annualReturn: 0.055, colour: "#10b981" },
  "global-80": { label: "LifeStrategy® Global 80%", annualReturn: 0.065, colour: "#f59e0b" },
};

export function OwnershipClient({
  monthlyContributionPence,
  projectedMonthlyContributionPence,
}: OwnershipClientProps) {
  const [selectedFundKey, setSelectedFundKey] = useState("global-60");
  // TODO: tighten type if needed
  const selectedFund = FUNDS[selectedFundKey as keyof typeof FUNDS];
  const effectiveContribution =
    monthlyContributionPence > 0
      ? monthlyContributionPence
      : projectedMonthlyContributionPence;

  // Shared Y-axis ceiling: highest Year-20 value across all funds, rounded up to the nearest
  // £100,000 (in pence). This keeps the scale identical as the user switches fund cards.
  const sharedYAxisMax = useMemo(() => {
    // Compute Year-20 pot for a given annual return rate — used to derive the shared Y-axis ceiling.
    const computeYear20Value = (annualReturn: number): number => {
      const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1;
      const months = 20 * 12;
      return monthlyRate === 0
        ? effectiveContribution * months
        : effectiveContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    };

    const maxValue = Math.max(...Object.values(FUNDS).map((f) => computeYear20Value(f.annualReturn)));
    const onePoundInPence = 100;
    const hundredThousandPounds = 100_000 * onePoundInPence;
    return Math.ceil(maxValue / hundredThousandPounds) * hundredThousandPounds;
  }, [effectiveContribution]);

  const projectionData = useMemo(() => {
    const monthlyRate = Math.pow(1 + selectedFund.annualReturn, 1 / 12) - 1;

    return Array.from({ length: 20 }, (_, index) => {
      const year = index + 1;
      const months = year * 12;
      const value =
        monthlyRate === 0
          ? effectiveContribution * months
          : effectiveContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

      return {
        month: year,
        value: Math.round(value),
      };
    });
  }, [effectiveContribution, selectedFund.annualReturn]);

  return (
    <div className="space-y-4">
      <FundSelector selectedFundKey={selectedFundKey} onSelect={setSelectedFundKey} />

      <Card>
        <CardHeader>
          <CardTitle className="type-section-title">{selectedFund.label} Projection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProjectionChart data={projectionData} lineColour={selectedFund.colour} yAxisMax={sharedYAxisMax} />
          {monthlyContributionPence === 0 && projectedMonthlyContributionPence > 0 ? (
            <p className="type-caption text-zinc-500 mt-2">
              {/* TODO: thread currency prop when multi-currency goes live */}
              Projection based on estimated {formatMoney(projectedMonthlyContributionPence, "GBP", { decimals: 0 })}/month
              contribution once buffer is funded and debt is cleared.
            </p>
          ) : null}
          <p className="type-caption text-zinc-600">
            Illustrative only. Assumes consistent monthly contribution and stated annual return net of 0.2% OCF. Past
            performance is not a reliable indicator of future results.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
