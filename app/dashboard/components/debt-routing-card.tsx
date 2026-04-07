"use client";

import type { DebtAllocation } from "@/lib/rae/types";

type DebtContext = {
  id: string;
  label: string;
  apr: number;
};

type DebtRoutingCardProps = {
  allocations: DebtAllocation[];
  debts: DebtContext[];
  formatPounds: (value: number) => string;
};

export function DebtRoutingCard({ allocations, debts, formatPounds }: DebtRoutingCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="type-section-title text-zinc-900">Debt Priority Routing</p>
      <div className="mt-3 space-y-2 text-sm">
        {allocations.length === 0 ? (
          <p className="text-zinc-500">No debt routing this cycle.</p>
        ) : (
          allocations.map((allocation) => {
            const debt = debts.find((d) => d.id === allocation.debtId);
            return (
              <div
                key={allocation.debtId}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <p className="font-medium text-zinc-800">{debt?.label ?? allocation.debtId}</p>
                <p className="text-zinc-600">
                  {formatPounds(allocation.amount)} at {((debt?.apr ?? 0) * 100).toFixed(1)}% APR
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
