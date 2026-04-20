"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { captureEvent } from "@/lib/analytics";
import { getCurrentTenantId } from "@/lib/server/tenant-context";
import {
  poundsStringToPence,
  aprStringToDecimal,
  isPositiveNumber,
  isNonNegativeNumber,
} from "@/lib/utils";
import { RailLogo } from "@/components/brand/RailLogo";

type Step1Data = {
  displayName: string;
  monthlyIncomeStr: string;
  fixedObligationsStr: string;
  bufferBalanceStr: string;
  incomeType: "stable" | "variable" | "highly-variable";
};

type DebtEntry = {
  localId: string;
  label: string;
  debtType: "CARD" | "LOAN" | "BNPL" | "OVERDRAFT" | "OTHER";
  balanceStr: string;
  aprStr: string;
  minPaymentStr: string;
};

export function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [step1, setStep1] = useState<Step1Data>({
    displayName: "",
    monthlyIncomeStr: "",
    fixedObligationsStr: "",
    bufferBalanceStr: "",
    incomeType: "stable",
  });
  const [commitmentScore, setCommitmentScore] = useState<number>(0.6);
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [errors, setErrors] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleStep1Continue() {
    setErrors(null);
    if (!step1.displayName.trim()) {
      setErrors("Please enter a household name.");
      return;
    }
    if (!isPositiveNumber(step1.monthlyIncomeStr)) {
      setErrors("Please enter a valid monthly income greater than £0.");
      return;
    }
    if (!isNonNegativeNumber(step1.fixedObligationsStr)) {
      setErrors("Please enter a valid amount for fixed obligations (£0 or more).");
      return;
    }
    if (!isNonNegativeNumber(step1.bufferBalanceStr)) {
      setErrors("Please enter a valid buffer balance (£0 or more).");
      return;
    }
    setStep(2);
  }

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

  async function handleSubmit(debtsToWrite: DebtEntry[]) {
    setErrors(null);

    for (const debt of debtsToWrite) {
      if (!debt.label.trim()) {
        setErrors("Please enter a label for each debt.");
        return;
      }
      if (!isPositiveNumber(debt.balanceStr)) {
        setErrors("Please enter a valid balance (greater than £0) for each debt.");
        return;
      }
      if (!isPositiveNumber(debt.aprStr) || parseFloat(debt.aprStr) > 100) {
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

      const monthlyIncome = poundsStringToPence(step1.monthlyIncomeStr);
      const incomeVolatility =
        step1.incomeType === "stable"
          ? 0
          : step1.incomeType === "variable"
            ? Math.round(monthlyIncome * 0.2)
            : Math.round(monthlyIncome * 0.4);
      const fixedObligations = poundsStringToPence(step1.fixedObligationsStr);
      const bufferBalance = poundsStringToPence(step1.bufferBalanceStr);

      const { data: existing } = await supabase
        .from("household_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let householdId: string;

      if (existing) {
        await supabase
          .from("household_profiles")
          .update({
            display_name: step1.displayName.trim(),
            monthly_income: monthlyIncome,
            income_volatility: incomeVolatility,
            fixed_obligations: fixedObligations,
            buffer_balance: bufferBalance,
            plan_commitment_score: commitmentScore,
          })
          .eq("user_id", user.id);
        householdId = existing.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("household_profiles")
          .insert({
            user_id: user.id,
            tenant_id: getCurrentTenantId(),
            display_name: step1.displayName.trim(),
            is_synthetic: false,
            monthly_income: monthlyIncome,
            income_volatility: incomeVolatility,
            fixed_obligations: fixedObligations,
            buffer_balance: bufferBalance,
            plan_commitment_score: commitmentScore,
          })
          .select("id")
          .single();
        if (insertError || !inserted) {
          throw new Error("Failed to create household profile.");
        }
        householdId = inserted.id;
      }

      const { error: deleteDebtError } = await supabase
        .from("debt_instruments")
        .delete()
        .eq("household_id", householdId);
      if (deleteDebtError) throw new Error("Failed to reset debt instruments.");

      if (debtsToWrite.length > 0) {
        const { error: debtError } = await supabase
          .from("debt_instruments")
          .insert(
            debtsToWrite.map((d) => ({
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

      captureEvent("onboarding_completed");
      router.push("/dashboard");
    } catch (err) {
      setErrors(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className={`min-h-screen bg-white flex flex-col items-center px-6 py-12 ${step === 1 ? "justify-center" : ""}`}
    >
      <RailLogo variant="lockup" height={32} />

      <div className="mt-4 flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${step >= 1 ? "bg-[#0D3560]" : "bg-zinc-200"}`}
        />
        <span
          className={`w-2 h-2 rounded-full ${step >= 2 ? "bg-[#0D3560]" : "bg-zinc-200"}`}
        />
        <p className="ml-2 type-caption text-zinc-500">Step {step} of 2</p>
      </div>

      {step === 1 ? (
        <div className="mt-6 w-full max-w-md">
          <h1 className="type-h1">Tell us about your household</h1>
          <p className="mt-2 type-body text-zinc-500">
            This lets Rail calculate your personalised financial plan.
          </p>

          <div className="mt-6 space-y-4">
            <div className="space-y-1">
              <label className="type-form-label" htmlFor="displayName">
                Household name
              </label>
              <p className="type-caption text-zinc-400">e.g. Sarah &amp; James</p>
              <input
                id="displayName"
                type="text"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                value={step1.displayName}
                onChange={(e) =>
                  setStep1((prev) => ({ ...prev, displayName: e.target.value }))
                }
                autoComplete="off"
              />
            </div>

            <div className="space-y-1">
              <label className="type-form-label" htmlFor="monthlyIncome">
                Monthly take-home income
              </label>
              <p className="type-caption text-zinc-400">£ · Combined net monthly income</p>
              <input
                id="monthlyIncome"
                type="number"
                min="0"
                step="1"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                value={step1.monthlyIncomeStr}
                onChange={(e) =>
                  setStep1((prev) => ({ ...prev, monthlyIncomeStr: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <label className="type-form-label" htmlFor="fixedObligations">
                Monthly fixed obligations
              </label>
              <p className="type-caption text-zinc-400">
                £ · Rent, utilities, subscriptions - not debt payments
              </p>
              <input
                id="fixedObligations"
                type="number"
                min="0"
                step="1"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                value={step1.fixedObligationsStr}
                onChange={(e) =>
                  setStep1((prev) => ({ ...prev, fixedObligationsStr: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <label className="type-form-label" htmlFor="bufferBalance">
                Current buffer / savings balance
              </label>
              <p className="type-caption text-zinc-400">
                £ · Your emergency fund or savings account
              </p>
              <input
                id="bufferBalance"
                type="number"
                min="0"
                step="1"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                value={step1.bufferBalanceStr}
                onChange={(e) =>
                  setStep1((prev) => ({ ...prev, bufferBalanceStr: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <label className="type-form-label" htmlFor="incomeType">
                Income type
              </label>
              <p className="type-caption text-zinc-400">How stable is your monthly income?</p>
              <select
                id="incomeType"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
                value={step1.incomeType}
                onChange={(e) =>
                  setStep1((prev) => ({
                    ...prev,
                    incomeType: e.target.value as Step1Data["incomeType"],
                  }))
                }
              >
                <option value="stable">Stable salary or fixed income</option>
                <option value="variable">Variable income (freelance, commission)</option>
                <option value="highly-variable">Highly variable (irregular, self-employed)</option>
              </select>
            </div>
          </div>

          {errors ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 type-body text-red-700">
              {errors}
            </div>
          ) : null}

          <div className="mt-6 space-y-1">
            <label className="type-form-label">
              How committed are you to following your financial plan?
            </label>
            <p className="type-caption text-zinc-400">
              This personalises your debt payoff strategy.
            </p>
            <select
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 type-body outline-none focus:border-zinc-400"
              value={String(commitmentScore)}
              onChange={(e) => setCommitmentScore(parseFloat(e.target.value))}
            >
              <option value="0.2">1 — Very unlikely to stick to it</option>
              <option value="0.4">2 — Unlikely</option>
              <option value="0.6">3 — Neutral — I&apos;ll try</option>
              <option value="0.8">4 — Likely</option>
              <option value="1.0">5 — Very committed</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleStep1Continue}
            className="mt-6 h-10 w-full rounded-md bg-[#0D3560] px-4 type-button text-white"
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="mt-6 w-full max-w-md">
          <h1 className="type-h1">Do you have any debts?</h1>
          <p className="mt-2 type-body text-zinc-500">
            Credit cards, loans, BNPL - Rail will sequence your payoff optimally.
          </p>

          <div className="mt-6 space-y-4">
            {debts.map((debt) => (
              <div
                key={debt.localId}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="type-body-strong text-zinc-900">Debt</p>
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
                      updateDebt(debt.localId, "debtType", e.target.value as DebtEntry["debtType"])
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
                      onChange={(e) => updateDebt(debt.localId, "minPaymentStr", e.target.value)}
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
              className="mt-4 type-button text-[#0D3560] hover:underline"
            >
              + Add a debt
            </button>
          ) : (
            <p className="mt-4 type-caption text-zinc-400">
              Maximum 5 debts supported in the prototype.
            </p>
          )}

          {errors ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 type-body text-red-700">
              {errors}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSubmit(debts)}
            disabled={isSubmitting}
            className="mt-6 h-10 w-full rounded-md bg-[#0D3560] px-4 type-button text-white disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Continue ->"}
          </button>

          <button
            type="button"
            onClick={() => void handleSubmit([])}
            disabled={isSubmitting}
            className="mt-3 h-10 w-full rounded-md border border-zinc-200 bg-white px-4 type-button text-zinc-600 disabled:opacity-50"
          >
            Skip - I have no debts
          </button>

          <button
            type="button"
            onClick={() => {
              setErrors(null);
              setStep(1);
            }}
            className="mt-3 w-full type-caption text-zinc-400 hover:text-zinc-600"
          >
            &lt;- Back
          </button>
        </div>
      )}
    </main>
  );
}
