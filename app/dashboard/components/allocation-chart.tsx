"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatPounds } from "@/lib/utils";

type ChartDatum = {
  name: string;
  value: number;
  fill: string;
};

type AllocationChartProps = {
  data: ChartDatum[];
};

export function AllocationChart({ data }: AllocationChartProps) {
  return (
    <div className="h-56 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      {data.length === 0 ? (
        <p className="p-4 text-sm text-zinc-500">No positive allocation this cycle.</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} innerRadius={54} outerRadius={82} dataKey="value" paddingAngle={3}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatPounds(value)} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
