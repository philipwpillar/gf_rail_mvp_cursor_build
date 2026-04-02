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

type ProjectionPoint = {
  month: number;
  value: number;
};

type ProjectionChartProps = {
  data: ProjectionPoint[];
  lineColour?: string;
};

function formatPoundsFromPence(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`;
}

export function ProjectionChart({ data, lineColour = "#10b981" }: ProjectionChartProps) {
  return (
    <div className="h-[280px] rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: "Years", position: "insideBottom", offset: -5 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatPoundsFromPence(value)} />
          <Tooltip
            formatter={(value: number) => formatPoundsFromPence(value)}
            labelFormatter={(label: number) => `Year ${label}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColour}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name="Projected pot"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
