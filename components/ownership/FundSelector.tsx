"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type FundSelectorProps = {
  selectedFundKey: string;
  onSelect: (key: string) => void;
};

const FUND_NARRATIVES: Record<string, string> = {
  "global-40":
    "A cautious foundation. 40% global equities provide growth exposure while 60% bonds anchor stability. Suitable if you're prioritising capital preservation alongside modest long-term growth. At 0.2% OCF, this is among the lowest-cost cautious funds available in the UK.",
  "global-60":
    "The balanced default. 60% global equities, 40% bonds — broad diversification across 30,000+ holdings with a single fund. This is Rail's default recommendation for households at the Ownership stage: enough growth to beat inflation meaningfully over 10+ years, with bond ballast to smooth volatility.",
  "global-80":
    "Growth-oriented. 80% global equities means higher expected returns over a long horizon, with correspondingly more short-term volatility. Suitable if your timeline is 15+ years and you've demonstrated the behavioural discipline to hold through market downturns. Your Rail plan commitment score supports this.",
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

const HOVER_CLOSE_DELAY_MS = 120;

function FundCardWithPopover({
  fund,
  isActive,
  onSelect,
}: {
  fund: (typeof FUND_CARDS)[number];
  isActive: boolean;
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => () => clearCloseTimer(), []);

  const handleTriggerMouseEnter = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const handleTriggerMouseLeave = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  };

  const handleContentMouseEnter = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const handleContentMouseLeave = () => {
    clearCloseTimer();
    setOpen(false);
  };

  // TODO: tighten type if needed
  const narrative = FUND_NARRATIVES[fund.key as any] ?? "";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          clearCloseTimer();
          setOpen(false);
        }
      }}
      modal={false}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSelect(fund.key)}
          onMouseEnter={handleTriggerMouseEnter}
          onMouseLeave={handleTriggerMouseLeave}
          className="h-auto p-0 text-left hover:bg-transparent"
          aria-pressed={isActive}
        >
          <Card className={cn("w-full border-zinc-200", isActive ? "border-2 border-primary" : "border")}>
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="min-w-0 flex-1 text-sm">{fund.title}</CardTitle>
                <div className="flex shrink-0 items-center gap-1.5">
                  {fund.recommended ? <Badge variant="secondary">Recommended</Badge> : null}
                  <Info className="size-4 shrink-0 text-zinc-500" aria-hidden />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-zinc-600">
              <p>{fund.risk}</p>
              <p>{fund.ocf}</p>
            </CardContent>
          </Card>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        className="max-w-[320px] w-[min(320px,calc(100vw-2rem))]"
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-sm font-semibold text-zinc-900">{fund.title}</p>
        <p className="text-sm text-zinc-700">{narrative}</p>
      </PopoverContent>
    </Popover>
  );
}

export function FundSelector({ selectedFundKey, onSelect }: FundSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {FUND_CARDS.map((fund) => (
        <FundCardWithPopover
          key={fund.key}
          fund={fund}
          isActive={selectedFundKey === fund.key}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
