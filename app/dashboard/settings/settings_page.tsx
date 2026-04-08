"use client";

export type HouseholdFormData = {
  displayName: string;
  monthlyIncomeStr: string;
  fixedObligationsStr: string;
  bufferBalanceStr: string;
};

export type DebtEntry = {
  localId: string;
  label: string;
  debtType: "CARD" | "LOAN" | "BNPL" | "OVERDRAFT" | "OTHER";
  balanceStr: string;
  aprStr: string;
  minPaymentStr: string;
};

type SettingsPageProps = {
  initialHousehold: HouseholdFormData;
  initialDebts: DebtEntry[];
};

export function SettingsPage({ initialHousehold, initialDebts }: SettingsPageProps) {
  return (
    <div className="space-y-6 px-4 py-4 lg:px-6 lg:py-6">
      <div>
        <h2 className="type-h1">Household Settings</h2>
        <p className="mt-1 type-body text-zinc-500">
          Loading your profile for editing...
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="type-section-title text-zinc-900">Profile</p>
        <p className="mt-2 type-body text-zinc-600">{initialHousehold.displayName || "Unnamed household"}</p>
        <p className="mt-1 type-caption text-zinc-500">
          Debts loaded: {initialDebts.length}
        </p>
      </div>
    </div>
  );
}
