"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
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
    "The balanced default. 60% global equities, 40% bonds — broad diversification across 30,000+ holdings with a single fund. This is Rail's default recommended investment fund for households at the Ownership stage: enough growth to beat inflation meaningfully over 10+ years, with bond ballast to smooth volatility.",
  "global-80":
    "Growth-oriented. 80% global equities means higher expected returns over a long horizon, with correspondingly more short-term volatility. Suitable if your timeline is 15+ years and you've demonstrated the behavioural discipline to hold through market downturns. Your Rail plan commitment score supports this.",
};

const FUND_CARDS = [
  {
    key: "global-40",
    title: "LifeStrategy® Global 40% Equity Fund",
    risk: "Risk 4/7",
    ocf: "0.2% OCF",
  },
  {
    key: "global-60",
    title: "LifeStrategy® Global 60% Equity Fund",
    risk: "Risk 4/7",
    ocf: "0.2% OCF",
  },
  {
    key: "global-80",
    title: "LifeStrategy® Global 80% Equity Fund",
    risk: "Risk 5/7",
    ocf: "0.2% OCF",
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

  const handleInfoMouseEnter = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const handleInfoMouseLeave = () => {
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
    <div className="relative w-full">
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
        <button
          type="button"
          onClick={() => onSelect(fund.key)}
          aria-pressed={isActive}
          className={cn(
            "w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          <Card
            className={cn(
              "pointer-events-none w-full border-zinc-200",
              isActive ? "border-2 border-primary" : "border",
            )}
          >
            <CardHeader className="space-y-2 pr-11">
              <CardTitle className="text-sm">{fund.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 type-body text-zinc-600">
              <p>{fund.risk}</p>
              <p>{fund.ocf}</p>
            </CardContent>
          </Card>
        </button>

        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-2 top-2 z-10 inline-flex size-9 items-center justify-center rounded-md text-zinc-500 outline-none hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`More information about ${fund.title}`}
            onMouseEnter={handleInfoMouseEnter}
            onMouseLeave={handleInfoMouseLeave}
            onClick={(e) => e.preventDefault()}
          >
            <Info className="size-4 shrink-0" aria-hidden />
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={6}
          className={cn(
            "max-w-lg w-[min(32rem,calc(100vw-2rem))] gap-3 border border-zinc-200 bg-white p-5 text-zinc-900 shadow-xl ring-0",
          )}
          onMouseEnter={handleContentMouseEnter}
          onMouseLeave={handleContentMouseLeave}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="text-base font-semibold leading-snug text-zinc-900">{fund.title}</p>
          <p className="type-body leading-relaxed text-zinc-800">{narrative}</p>
        </PopoverContent>
      </Popover>
    </div>
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
