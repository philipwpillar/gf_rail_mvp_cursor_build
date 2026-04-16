"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RailLogo } from "@/components/brand/RailLogo";

const BANKS = [
  { id: "barclays", name: "Barclays", initial: "B", colour: "#00AEEF" },
  { id: "hsbc", name: "HSBC", initial: "H", colour: "#DB0011" },
  { id: "lloyds", name: "Lloyds", initial: "L", colour: "#024731" },
  { id: "natwest", name: "NatWest", initial: "N", colour: "#42145F" },
  { id: "monzo", name: "Monzo", initial: "M", colour: "#FF3464" },
  { id: "starling", name: "Starling", initial: "S", colour: "#6935D3" },
  { id: "nationwide", name: "Nationwide", initial: "N", colour: "#0E4DE8" },
  { id: "santander", name: "Santander", initial: "S", colour: "#EC0000" },
] as const;

const STEPS = [
  "Connecting to {bank} via open banking…",
  "Reading transactions securely…",
  "Building your Rail plan…",
] as const;

export function ConnectPage() {
  const router = useRouter();
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [connecting, setConnecting] = useState<boolean>(false);

  useEffect(() => {
    if (!connecting) return undefined;

    const timeout1 = setTimeout(() => setStepIndex(0), 0);
    const timeout2 = setTimeout(() => setStepIndex(1), 1200);
    const timeout3 = setTimeout(() => setStepIndex(2), 2200);
    const timeout4 = setTimeout(() => router.push("/dashboard"), 3000);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      clearTimeout(timeout4);
    };
  }, [connecting, router]);

  function handleSelect(bankId: string) {
    if (connecting) return;
    setSelectedBank(bankId);
    setConnecting(true);
  }

  const selectedBankName =
    BANKS.find((bank) => bank.id === selectedBank)?.name ?? "your bank";
  const stepText = STEPS[stepIndex].replace("{bank}", selectedBankName);

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <RailLogo variant="lockup" height={32} />

      {!connecting ? (
        <>
          <h1 className="type-h1 mt-8 text-center">Connect your accounts</h1>
          <p className="type-body text-zinc-500 max-w-sm text-center mt-3">
            Rail uses read-only open banking to analyse your cashflow. We can never
            move your money.
          </p>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
            {BANKS.map((bank) => (
              <button
                key={bank.id}
                type="button"
                onClick={() => handleSelect(bank.id)}
                className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm cursor-pointer flex flex-col items-center justify-center transition"
              >
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: bank.colour }}
                >
                  {bank.initial}
                </span>
                <span className="type-body font-medium text-zinc-900 mt-3">{bank.name}</span>
              </button>
            ))}
          </div>

          <p className="type-caption text-zinc-400 mt-8 text-center">
            Powered by Truelayer. FCA-regulated open banking. Read-only access only.
          </p>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full border-4 border-zinc-200 border-t-[#3b82f6] animate-spin mt-8" />
          <p className="type-body font-medium text-zinc-900 mt-6 text-center">{stepText}</p>
          <p className="type-caption text-zinc-500 mt-2 text-center">
            This usually takes a few seconds.
          </p>
          <p className="type-caption text-zinc-400 mt-8 text-center">
            256-bit encryption · Read-only · FCA regulated
          </p>
        </>
      )}
    </main>
  );
}
