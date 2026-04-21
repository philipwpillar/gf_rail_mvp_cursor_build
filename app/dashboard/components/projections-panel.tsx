"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MinimumOnlyMonthlySnapshot, MonthlySnapshot } from "@/lib/rae/projections";
import { formatPounds } from "@/lib/utils";
import { formatMoney } from "@/lib/display/money";

type ProjectionsPanelProps = {
  debtFreeMonth: number | null;
  totalInterestSavedVsMinimum: number;
  monthlySnapshots: MonthlySnapshot[];
  minimumOnlySnapshots?: MinimumOnlyMonthlySnapshot[];
};

export function ProjectionsPanel({
  debtFreeMonth,
  totalInterestSavedVsMinimum,
  monthlySnapshots,
  minimumOnlySnapshots = [],
}: ProjectionsPanelProps) {
  const railData = monthlySnapshots.map((snapshot) => ({
    month: snapshot.month,
    totalDebtPounds: snapshot.totalDebt / 100,
    investmentValuePounds: snapshot.investmentValue / 100,
  }));
  const minimumData = minimumOnlySnapshots.map((snapshot) => ({
    month: snapshot.month,
    minimumDebtPounds: snapshot.totalDebt / 100,
  }));
  const chartData = Array.from({ length: 60 }, (_, i) => {
    const rail = railData[i];
    const minimum = minimumData[i];
    return {
      month: i + 1,
      // Stop plotting once debt is cleared - undefined produces a gap in Recharts
      totalDebtPounds:
        rail?.totalDebtPounds != null && rail.totalDebtPounds > 0
          ? rail.totalDebtPounds
          : undefined,
      investmentValuePounds: rail?.investmentValuePounds,
      minimumDebtPounds:
        minimum?.minimumDebtPounds != null && minimum.minimumDebtPounds > 0
          ? minimum.minimumDebtPounds
          : undefined,
    };
  });
  const projectedInvestment = monthlySnapshots[59]?.investmentValue ?? 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="type-section-title text-zinc-900">Debt & Investment — 5 Year View</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="type-label text-zinc-500">Debt free</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {debtFreeMonth === null
              ? "Not in 60 months"
              : debtFreeMonth === 0
                ? "Already clear"
                : `Month ${debtFreeMonth}`}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="type-label text-zinc-500">Interest saved</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {formatPounds(totalInterestSavedVsMinimum)}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="type-label text-zinc-500">Investment pot</p>
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
            {/* TODO: thread currency prop when multi-currency goes live */}
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatMoney(value, "GBP", { decimals: 0 })} />
            {debtFreeMonth != null && debtFreeMonth > 0 && debtFreeMonth <= 60 ? (
              <ReferenceLine
                x={debtFreeMonth}
                stroke="#8b5cf6"
                strokeDasharray="4 2"
                strokeWidth={1.5}
                label={{
                  value: "Debt cleared ✓",
                  position: "insideTopRight",
                  fontSize: 11,
                  fill: "#8b5cf6",
                  dy: 4,
                }}
              />
            ) : null}
            <Tooltip
              formatter={(value: number) => formatMoney(value, "GBP")}
              labelFormatter={(label: number) => `Month ${label}`}
            />
            <Line
              type="monotone"
              dataKey="totalDebtPounds"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
              name="Debt (Rail)"
            />
            <Line
              type="monotone"
              dataKey="minimumDebtPounds"
              stroke="#e11d48"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
              name="Minimums only"
            />
            <Line
              type="monotone"
              dataKey="investmentValuePounds"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="Investment (Rail)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-4 type-caption text-zinc-600">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500" aria-hidden="true" />
          <span>Debt (Rail)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 border-t-2 border-dashed border-rose-600" aria-hidden="true" />
          <span>Minimums only</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>Investment (Rail)</span>
        </div>
      </div>
    </div>
  );
}
