"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PipelineStage, type RAEResult } from "@/lib/rae/types";

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function stageLabel(stage: PipelineStage): string {
  switch (stage) {
    case PipelineStage.STAGE_1_RESILIENCE:
      return "Stage 1 - Building Safety Net";
    case PipelineStage.STAGE_2_DEBT:
      return "Stage 2 - Eliminating Debt";
    case PipelineStage.STAGE_3_OWNERSHIP:
      return "Stage 3 - Building Ownership";
    default:
      return stage;
  }
}

function debtTotal(result: RAEResult): number {
  return result.finalAllocation.debtAllocations.reduce((sum, d) => sum + d.amount, 0);
}

type ApiContext = {
  householdName: string;
  debts: {
    id: string;
    label: string;
    apr: number;
    balance: number;
    minPayment: number;
    isActive: boolean;
  }[];
};

type ApiPayload = {
  result: RAEResult;
  context: ApiContext;
};

type NavItem = {
  label: string;
  short: string;
  icon: ReactNode;
  active?: boolean;
};

function stageTone(stage: PipelineStage): string {
  if (stage === PipelineStage.STAGE_1_RESILIENCE) return "bg-amber-100 text-amber-800";
  if (stage === PipelineStage.STAGE_2_DEBT) return "bg-rose-100 text-rose-800";
  return "bg-emerald-100 text-emerald-800";
}

export function RaeOutputCard() {
  const [result, setResult] = useState<RAEResult | null>(null);
  const [context, setContext] = useState<ApiContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRaeResult() {
      try {
        const response = await fetch("/api/rae", { method: "GET" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load RAE result.");
        }

        const typedPayload = payload as ApiPayload;
        if (isMounted) {
          setResult(typedPayload.result);
          setContext(typedPayload.context);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load RAE result.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRaeResult();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("rail.sidebar.collapsed");
    if (saved === "true") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  function toggleSidebar() {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("rail.sidebar.collapsed", String(next));
      return next;
    });
  }

  const chartData =
    !result
      ? []
      : [
          { name: "Buffer", value: result.finalAllocation.bufferContribution, fill: "#0ea5e9" },
          { name: "Debt", value: debtTotal(result), fill: "#8b5cf6" },
          {
            name: "Investment",
            value: result.finalAllocation.investmentContribution,
            fill: "#22c55e",
          },
        ].filter((item) => item.value > 0);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      short: "D",
      active: true,
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M3 3h8v8H3V3Zm10 0h8v5h-8V3ZM3 13h5v8H3v-8Zm7 0h11v8H10v-8Z" />
        </svg>
      ),
    },
    {
      label: "Household Profile",
      short: "H",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"
          />
        </svg>
      ),
    },
    {
      label: "Debt Instruments",
      short: "DI",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="currentColor"
            d="M2 6h20v12H2V6Zm2 2v8h16V8H4Zm2 2h6v2H6v-2Zm0 3h10v2H6v-2Z"
          />
        </svg>
      ),
    },
    {
      label: "Plan Scenarios",
      short: "PS",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M4 4h16v2H4V4Zm0 5h10v2H4V9Zm0 5h16v2H4v-2Zm0 5h10v2H4v-2Z" />
        </svg>
      ),
    },
    {
      label: "Execution Log",
      short: "EL",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="currentColor"
            d="M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM8 10h8v2H8v-2Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
      <div
        className={`grid min-h-[760px] grid-cols-1 ${isSidebarCollapsed ? "lg:grid-cols-[84px_1fr]" : "lg:grid-cols-[260px_1fr]"}`}
      >
        <aside className="border-r border-zinc-200 bg-[#0f2240] text-zinc-100 transition-all duration-200">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
            {!isSidebarCollapsed ? (
              <div>
                <p className="text-lg font-semibold tracking-wide">RAIL CFO</p>
                <p className="text-xs text-zinc-300">Household planning workspace</p>
              </div>
            ) : (
              <p className="text-lg font-semibold tracking-wide">RC</p>
            )}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-expanded={!isSidebarCollapsed}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="rounded-md border border-white/20 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
            >
              {isSidebarCollapsed ? ">" : "<"}
            </button>
          </div>
          <nav className="space-y-1 px-3 py-4 text-sm">
            {navItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-md px-3 py-2 ${item.active ? "bg-white/10 font-medium text-zinc-100" : "text-zinc-300"}`}
                title={item.label}
              >
                <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2"}`}>
                  <span className="inline-flex items-center justify-center text-zinc-200">{item.icon}</span>
                  {isSidebarCollapsed ? (
                    <span className="sr-only">{item.short}</span>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </div>
              </div>
            ))}
          </nav>
          {!isSidebarCollapsed ? (
            <div className="mt-8 px-5 text-xs text-zinc-400">
              <p className="font-medium uppercase tracking-wide text-zinc-300">Household</p>
              <p className="mt-1 text-sm text-zinc-200">{context?.householdName ?? "Loading..."}</p>
            </div>
          ) : null}
        </aside>

        <section className="bg-zinc-50 p-5">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Household Plan Scenario</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Live recommendation from <code>/api/rae</code> using pure <code>runRAE</code>.
                </p>
              </div>
              {result ? (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageTone(result.stage)}`}>
                  {stageLabel(result.stage)}
                </span>
              ) : null}
            </div>

            <div className="mt-5 border-b border-zinc-200">
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="border-b-2 border-blue-500 pb-2 font-medium text-blue-600">
                  Allocation Plan
                </div>
                <div className="pb-2 text-zinc-500">Cash Flow View</div>
                <div className="pb-2 text-zinc-500">Historical Trends</div>
                <div className="pb-2 text-zinc-500">Stress Test</div>
              </div>
            </div>

            {isLoading ? (
              <p className="mt-6 text-sm text-zinc-700">Loading recommendation workspace...</p>
            ) : null}

            {!isLoading && error ? (
              <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {!isLoading && !error && result ? (
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Monthly Surplus</p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-900">
                      {formatPounds(result.surplus)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Current Buffer Floor</p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-900">{formatPounds(result.bMin)}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Target Buffer</p>
                    <p className="mt-2 text-3xl font-semibold text-zinc-900">
                      {formatPounds(result.bTarget)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-sm font-semibold text-zinc-900">Income Allocation Plan (This Month)</p>
                  <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs text-blue-700">Buffer Contribution</p>
                        <p className="mt-2 text-xl font-semibold text-blue-900">
                          {formatPounds(result.finalAllocation.bufferContribution)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                        <p className="text-xs text-violet-700">Debt Contribution</p>
                        <p className="mt-2 text-xl font-semibold text-violet-900">
                          {formatPounds(debtTotal(result))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs text-emerald-700">Investment Contribution</p>
                        <p className="mt-2 text-xl font-semibold text-emerald-900">
                          {formatPounds(result.finalAllocation.investmentContribution)}
                        </p>
                      </div>
                    </div>
                    <div className="h-56 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                      {chartData.length === 0 ? (
                        <p className="p-4 text-sm text-zinc-500">No positive allocation this cycle.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              innerRadius={54}
                              outerRadius={82}
                              dataKey="value"
                              paddingAngle={3}
                            >
                              {chartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatPounds(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <p className="text-sm font-semibold text-zinc-900">Debt Priority Routing</p>
                    <div className="mt-3 space-y-2 text-sm">
                      {result.finalAllocation.debtAllocations.length === 0 ? (
                        <p className="text-zinc-500">No debt routing this cycle.</p>
                      ) : (
                        result.finalAllocation.debtAllocations.map((allocation) => {
                          const debt = context?.debts.find((d) => d.id === allocation.debtId);
                          return (
                            <div
                              key={allocation.debtId}
                              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
                            >
                              <p className="font-medium text-zinc-800">{debt?.label ?? allocation.debtId}</p>
                              <p className="text-zinc-600">
                                {formatPounds(allocation.amount)} at {((debt?.apr ?? 0) * 100).toFixed(1)}%
                                {" "}APR
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <p className="text-sm font-semibold text-zinc-900">Risk & Rationale</p>
                    <div className="mt-3 space-y-2 text-sm text-zinc-700">
                      <p>
                        <span className="font-medium">Shock adjustment:</span>{" "}
                        {result.shockApplied ? "Applied" : "Not applied"}
                      </p>
                      <p>
                        <span className="font-medium">Shock factor:</span>{" "}
                        {result.shockFactor === null ? "N/A" : result.shockFactor.toFixed(2)}
                      </p>
                      <p>
                        <span className="font-medium">Redirected amount:</span>{" "}
                        {result.shockRedirectAmount === null
                          ? "N/A"
                          : formatPounds(result.shockRedirectAmount)}
                      </p>
                      <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-zinc-700">
                        {result.rationale}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
