"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

function poundsStringToPence(str: string): number {
  return Math.round(parseFloat(str) * 100);
}

function aprStringToDecimal(str: string): number {
  return parseFloat(str) / 100;
}

function isPositiveNumber(str: string): boolean {
  const n = parseFloat(str);
  return !isNaN(n) && n > 0;
}

function isNonNegativeNumber(str: string): boolean {
  const n = parseFloat(str);
  return !isNaN(n) && n >= 0;
}

export function SettingsPage({ initialHousehold, initialDebts }: SettingsPageProps) {
  const router = useRouter();
  const [form, setForm] = useState<HouseholdFormData>(initialHousehold);
  const [debts, setDebts] = useState<DebtEntry[]>(initialDebts);
  const [errors, setErrors] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addDebt() {
    if (debts.length >= 5) return;
    setDebts((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        label: "",
        debtType: "CARD",
        balanceStr: "",
        aprStr: "",
        minPaymentStr: "",
      },
    ]);
  }

  function removeDebt(localId: string) {
    setDebts((prev) => prev.filter((d) => d.localId !== localId));
  }

  function updateDebt(
    localId: string,
    field: keyof Omit<DebtEntry, "localId">,
    value: string,
  ) {
    setDebts((prev) =>
      prev.map((d) => (d.localId === localId ? { ...d, [field]: value } : d)),
    );
  }

  async function handleSave() {
    setErrors(null);

    if (!form.displayName.trim()) {
      setErrors("Please enter a household name.");
      return;
    }
    if (!isPositiveNumber(form.monthlyIncomeStr)) {
      setErrors("Please enter a valid monthly income greater than £0.");
      return;
    }
    if (!isNonNegativeNumber(form.fixedObligationsStr)) {
      setErrors("Please enter a valid amount for fixed obligations (£0 or more).");
      return;
    }
    if (!isNonNegativeNumber(form.bufferBalanceStr)) {
      setErrors("Please enter a valid buffer balance (£0 or more).");
      return;
    }

    for (const debt of debts) {
      if (!debt.label.trim()) {
        setErrors("Please enter a label for each debt.");
        return;
      }
      if (!isPositiveNumber(debt.balanceStr)) {
        setErrors("Please enter a valid balance (greater than £0) for each debt.");
        return;
      }
      if (!isNonNegativeNumber(debt.aprStr) || parseFloat(debt.aprStr) > 100) {
        setErrors("Please enter a valid APR between 0 and 100% for each debt.");
        return;
      }
      if (!isPositiveNumber(debt.minPaymentStr)) {
        setErrors("Please enter a valid minimum monthly payment for each debt.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const monthlyIncome = poundsStringToPence(form.monthlyIncomeStr);
      const fixedObligations = poundsStringToPence(form.fixedObligationsStr);
      const bufferBalance = poundsStringToPence(form.bufferBalanceStr);

      const { data: existing, error: existingError } = await supabase
        .from("household_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existingError) {
        throw new Error("Failed to load household profile.");
      }

      let householdId: string;

      if (existing) {
        const { error: updateError } = await supabase
          .from("household_profiles")
          .update({
            display_name: form.displayName.trim(),
            monthly_income: monthlyIncome,
            income_volatility: 0,
            fixed_obligations: fixedObligations,
            buffer_balance: bufferBalance,
          })
          .eq("user_id", user.id);
        if (updateError) throw new Error("Failed to update household profile.");
        householdId = existing.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("household_profiles")
          .insert({
            user_id: user.id,
            display_name: form.displayName.trim(),
            is_synthetic: false,
            monthly_income: monthlyIncome,
            income_volatility: 0,
            fixed_obligations: fixedObligations,
            buffer_balance: bufferBalance,
            plan_commitment_score: 0.5,
          })
          .select("id")
          .single();
        if (insertError || !inserted) {
          throw new Error("Failed to create household profile.");
        }
        householdId = inserted.id;
      }

      const { error: deleteError } = await supabase
        .from("debt_instruments")
        .delete()
        .eq("household_id", householdId);
      if (deleteError) throw new Error("Failed to reset debt instruments.");

      if (debts.length > 0) {
        const { error: debtError } = await supabase
          .from("debt_instruments")
          .insert(
            debts.map((d) => ({
              household_id: householdId,
              label: d.label.trim(),
              lender: null,
              debt_type: d.debtType,
              balance: poundsStringToPence(d.balanceStr),
              apr: aprStringToDecimal(d.aprStr),
              min_payment: poundsStringToPence(d.minPaymentStr),
              is_active: true,
            })),
          );
        if (debtError) throw new Error("Failed to save debt instruments.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setErrors(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 px-4 py-4 lg:px-6 lg:py-6">
      <div>
        <h2 className="type-h1">Household Settings</h2>
        <p className="mt-1 type-body text-zinc-500">
          Update your household profile. Changes take effect immediately on your plan.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="type-section-title text-zinc-900">Profile</p>
        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="type-form-label" htmlFor="displayName">
              Household name
            </label>
            <input
              id="displayName"
              type="text"
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
              value={form.displayName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, displayName: e.target.value }))
              }
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="type-form-label" htmlFor="monthlyIncome">
                Monthly income (£)
              </label>
              <p className="type-caption text-zinc-400">Combined net monthly</p>
              <input
                id="monthlyIncome"
                type="number"
                min="0"
                step="1"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                value={form.monthlyIncomeStr}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, monthlyIncomeStr: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="type-form-label" htmlFor="fixedObligations">
                Fixed obligations (£)
              </label>
              <p className="type-caption text-zinc-400">Rent, utilities, subs</p>
              <input
                id="fixedObligations"
                type="number"
                min="0"
                step="1"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                value={form.fixedObligationsStr}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    fixedObligationsStr: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="type-form-label" htmlFor="bufferBalance">
                Buffer balance (£)
              </label>
              <p className="type-caption text-zinc-400">Emergency fund / savings</p>
              <input
                id="bufferBalance"
                type="number"
                min="0"
                step="1"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                value={form.bufferBalanceStr}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, bufferBalanceStr: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="type-section-title text-zinc-900">Debt stack</p>
        <p className="mt-1 type-caption text-zinc-500">
          Editing this list replaces your current debt stack entirely on save.
        </p>

        <div className="mt-4 space-y-4">
          {debts.map((debt) => (
            <div
              key={debt.localId}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="type-body-strong text-zinc-900">
                  {debt.label || "New debt"}
                </p>
                <button
                  type="button"
                  onClick={() => removeDebt(debt.localId)}
                  className="type-caption text-zinc-400 hover:text-red-500"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-1">
                <label className="type-form-label">Label</label>
                <input
                  type="text"
                  placeholder="e.g. Barclaycard Visa"
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                  value={debt.label}
                  onChange={(e) => updateDebt(debt.localId, "label", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="type-form-label">Type</label>
                <select
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                  value={debt.debtType}
                  onChange={(e) =>
                    updateDebt(
                      debt.localId,
                      "debtType",
                      e.target.value as DebtEntry["debtType"],
                    )
                  }
                >
                  <option value="CARD">Credit card</option>
                  <option value="LOAN">Personal loan</option>
                  <option value="BNPL">Buy now, pay later</option>
                  <option value="OVERDRAFT">Overdraft</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="type-form-label">Balance (£)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                    value={debt.balanceStr}
                    onChange={(e) => updateDebt(debt.localId, "balanceStr", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="type-form-label">APR (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="0.0"
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                    value={debt.aprStr}
                    onChange={(e) => updateDebt(debt.localId, "aprStr", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="type-form-label">Min payment (£/mo)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                    value={debt.minPaymentStr}
                    onChange={(e) =>
                      updateDebt(debt.localId, "minPaymentStr", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {debts.length < 5 ? (
          <button
            type="button"
            onClick={addDebt}
            className="mt-4 type-button text-[#3b82f6] hover:underline"
          >
            + Add a debt
          </button>
        ) : null}
      </div>

      {errors ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 type-body text-red-700">
          {errors}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSubmitting}
          className="h-10 rounded-md bg-black px-6 type-button text-white disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          disabled={isSubmitting}
          className="h-10 rounded-md border border-zinc-200 bg-white px-6 type-button text-zinc-600 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
