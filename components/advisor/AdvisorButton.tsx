"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { AdvisorPanel } from "@/components/advisor/AdvisorPanel";

type AdvisorButtonProps = {
  householdId: string;
  householdName: string;
};

export function AdvisorButton({ householdId, householdName }: AdvisorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AdvisorPanel
        householdId={householdId}
        householdName={householdName}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      />
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close Rail Advisor" : "Open Rail Advisor"}
        className="fixed right-6 bottom-6 z-40 inline-flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700"
      >
        {isOpen ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </>
  );
}
