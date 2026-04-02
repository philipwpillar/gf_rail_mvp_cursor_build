"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FundSelectorProps = {
  selectedFundKey: string;
  onSelect: (key: string) => void;
};

const FUND_CARDS = [
  {
    key: "global-40",
    title: "LifeStrategy® Global 40% Equity Fund",
    risk: "Risk 4/7",
    ocf: "0.2% OCF",
    recommended: false,
  },
  {
    key: "global-60",
    title: "LifeStrategy® Global 60% Equity Fund",
    risk: "Risk 4/7",
    ocf: "0.2% OCF",
    recommended: true,
  },
  {
    key: "global-80",
    title: "LifeStrategy® Global 80% Equity Fund",
    risk: "Risk 5/7",
    ocf: "0.2% OCF",
    recommended: false,
  },
] as const;

export function FundSelector({ selectedFundKey, onSelect }: FundSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {FUND_CARDS.map((fund) => {
        const isActive = selectedFundKey === fund.key;

        return (
          <Button
            key={fund.key}
            variant="ghost"
            onClick={() => onSelect(fund.key)}
            className="h-auto p-0 text-left hover:bg-transparent"
            aria-pressed={isActive}
          >
            <Card className={cn("w-full border-zinc-200", isActive ? "border-2 border-primary" : "border")}>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{fund.title}</CardTitle>
                  {fund.recommended ? <Badge variant="secondary">Recommended</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-zinc-600">
                <p>{fund.risk}</p>
                <p>{fund.ocf}</p>
              </CardContent>
            </Card>
          </Button>
        );
      })}
    </div>
  );
}
