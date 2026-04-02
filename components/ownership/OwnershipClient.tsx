"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FundSelector } from "@/components/ownership/FundSelector";
import { ProjectionChart } from "@/components/ownership/ProjectionChart";

type OwnershipClientProps = {
  monthlyContributionPence: number;
};

const FUNDS = {
  "global-40": { label: "LifeStrategy® Global 40%", annualReturn: 0.045, colour: "#6366f1" },
  "global-60": { label: "LifeStrategy® Global 60%", annualReturn: 0.055, colour: "#10b981" },
  "global-80": { label: "LifeStrategy® Global 80%", annualReturn: 0.065, colour: "#f59e0b" },
};

const NARRATIVES = {
  "global-40":
    "A cautious foundation. 40% global equities provide growth exposure while 60% bonds anchor stability. Suitable if you're prioritising capital preservation alongside modest long-term growth. At 0.2% OCF, this is among the lowest-cost cautious funds available in the UK.",
  "global-60":
    "The balanced default. 60% global equities, 40% bonds — broad diversification across 30,000+ holdings with a single fund. This is Rail's default recommendation for households at the Ownership stage: enough growth to beat inflation meaningfully over 10+ years, with bond ballast to smooth volatility.",
  "global-80":
    "Growth-oriented. 80% global equities means higher expected returns over a long horizon, with correspondingly more short-term volatility. Suitable if your timeline is 15+ years and you've demonstrated the behavioural discipline to hold through market downturns. Your Rail plan commitment score supports this.",
};

export function OwnershipClient({ monthlyContributionPence }: OwnershipClientProps) {
  const [selectedFundKey, setSelectedFundKey] = useState("global-60");
  // TODO: tighten type if needed
  const selectedFund = FUNDS[selectedFundKey as keyof typeof FUNDS];

  const projectionData = useMemo(() => {
    const monthlyRate = Math.pow(1 + selectedFund.annualReturn, 1 / 12) - 1;

    return Array.from({ length: 20 }, (_, index) => {
      const year = index + 1;
      const months = year * 12;
      const value =
        monthlyRate === 0
          ? monthlyContributionPence * months
          : monthlyContributionPence * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

      return {
        month: year,
        value: Math.round(value),
      };
    });
  }, [monthlyContributionPence, selectedFund.annualReturn]);

  return (
    <div className="space-y-4">
      <FundSelector selectedFundKey={selectedFundKey} onSelect={setSelectedFundKey} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">{selectedFund.label} Projection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProjectionChart data={projectionData} lineColour={selectedFund.colour} />
          <p className="text-xs text-zinc-600">
            Illustrative only. Assumes consistent monthly contribution and stated annual return net of 0.2% OCF. Past
            performance is not a reliable indicator of future results.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Fund narrative</CardTitle>
        </CardHeader>
        <CardContent>
          <p key={selectedFundKey} className="text-sm text-zinc-700 transition-opacity duration-300 ease-in-out">
            {NARRATIVES[selectedFundKey as keyof typeof NARRATIVES]}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
