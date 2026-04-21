import { PipelineStage } from "@/lib/rae/types";
import { RailLogo } from "@/components/brand/RailLogo";
import { formatMoney } from "@/lib/display/money";

type RailTopBarProps = {
  householdName: string;
  stage: PipelineStage | null;
  surplus: number | null; // pence
};

function getStepState(
  stepIndex: number, // 0, 1, 2
  currentStage: PipelineStage | null,
): "done" | "active" | "future" {
  if (currentStage === null) return "future";
  const stageOrder = [
    PipelineStage.STAGE_1_RESILIENCE,
    PipelineStage.STAGE_2_DEBT,
    PipelineStage.STAGE_3_OWNERSHIP,
  ];
  const current = stageOrder.indexOf(currentStage);
  if (stepIndex < current) return "done";
  if (stepIndex === current) return "active";
  return "future";
}

const STEPS = ["Resilience", "Debt Elimination", "Ownership"] as const;

export function RailTopBar({ householdName, stage, surplus }: RailTopBarProps) {
  return (
    <div className="bg-[#0c1e35] h-14 flex items-center px-5 gap-0 border-b border-white/[0.08] flex-shrink-0">
      <RailLogo variant="icon" height={32} onDark />
      <div className="w-px h-7 bg-white/[0.12] mx-6" />

      <div className="flex-1 flex items-center">
        {STEPS.map((label, index) => {
          const stepState = getStepState(index, stage);
          const connectorDone = index === 0 ? stepState !== "future" && getStepState(1, stage) !== "future" : stepState !== "future" && getStepState(2, stage) !== "future";

          return (
            <div key={label} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                {stepState === "done" ? (
                  <div className="w-6 h-6 rounded-full bg-[#1d4ed8] flex items-center justify-center">
                    <svg viewBox="0 0 12 12" width="10" height="10">
                      <polyline
                        points="1.5,6 4.5,9 10.5,3"
                        stroke="white"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : stepState === "active" ? (
                  <div className="w-6 h-6 rounded-full bg-[#20E2D7] flex items-center justify-center text-[#0D3560] text-[11px] font-semibold ring-[3px] ring-[#20E2D7]/25">
                    {index + 1}
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-white/30 text-[11px] font-semibold">
                    {index + 1}
                  </div>
                )}

                <div className="flex flex-col leading-tight">
                  <span
                    className={`text-[10px] uppercase tracking-[0.05em] ${
                      stepState === "future" ? "text-white/30" : "text-[#93c5fd]"
                    }`}
                  >
                    Stage {index + 1}
                  </span>
                  <span
                    className={`text-[13px] font-medium ${
                      stepState === "done"
                        ? "text-[#93c5fd]"
                        : stepState === "active"
                          ? "text-white"
                          : "text-white/30"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </div>

              {index < STEPS.length - 1 ? (
                <div className={`flex-1 max-w-[48px] min-w-[16px] h-px ${connectorDone ? "bg-[#1d4ed8]" : "bg-white/[0.12]"}`} />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-5 ml-auto">
        <span className="text-[13px] text-white/55 font-normal truncate max-w-[140px]">{householdName}</span>
        {surplus !== null ? (
          <div className="flex flex-col items-end leading-tight bg-[#20E2D7]/15 border border-[#20E2D7]/30 rounded-full px-3 py-1">
            <span className="text-[9px] uppercase tracking-[0.08em] text-[#20E2D7]">Surplus</span>
            {/* TODO: thread currency prop from household context when multi-currency goes live */}
            <span className="text-[14px] font-semibold text-white">{formatMoney(surplus, "GBP", { decimals: 0 })}/mo</span>
          </div>
        ) : (
          <div className="w-20 h-8 rounded-full bg-white/10 animate-pulse" />
        )}
      </div>
    </div>
  );
}
