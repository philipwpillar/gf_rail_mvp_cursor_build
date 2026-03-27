"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlySnapshot } from "@/lib/rae/projections";

type ProjectionsPanelProps = {
  debtFreeMonth: number | null;
  totalInterestSavedVsMinimum: number;
  monthlySnapshots: MonthlySnapshot[];
};

function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function ProjectionsPanel({
  debtFreeMonth,
  totalInterestSavedVsMinimum,
  monthlySnapshots,
}: ProjectionsPanelProps) {
  const chartData = monthlySnapshots.map((snapshot) => ({
    month: snapshot.month,
    totalDebtPounds: snapshot.totalDebt / 100,
  }));
  const projectedInvestment = monthlySnapshots[59]?.investmentValue ?? 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-zinc-900">Five-Year Projection</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Debt free</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {debtFreeMonth === null
              ? "Not in 60 months"
              : debtFreeMonth === 0
                ? "Already clear"
                : `Month ${debtFreeMonth}`}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Interest saved</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {formatPounds(totalInterestSavedVsMinimum)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Investment pot</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {formatPounds(projectedInvestment)}
          </p>
        </div>
      </div>

      <div className="mt-4 h-[200px] rounded-lg border border-zinc-200 bg-zinc-50 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(value: number) => `£${value.toFixed(0)}`} />
            <Tooltip
              formatter={(value: number) => `£${value.toFixed(2)}`}
              labelFormatter={(label: number) => `Month ${label}`}
            />
            <Line
              type="monotone"
              dataKey="totalDebtPounds"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="With Rail"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* TODO: Add minimum-only baseline debt trajectory line in Phase 0B. */}
    </div>
  );
}
