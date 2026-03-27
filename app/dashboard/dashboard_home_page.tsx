import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RaeOutputCard } from "./rae-output-card";
import { buildRaeRecommendation, type RaeApiPayload } from "@/lib/server/rae-recommendation";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let initialError: string | null = null;
  let initialPayload: RaeApiPayload | null = null;
  try {
    initialPayload = await buildRaeRecommendation({
      supabase,
      userId: user.id,
      userEmail: user.email,
      writeAudit: true,
    });
  } catch {
    initialError = "We could not load your recommendation just now. Please refresh.";
  }

  return (
    <div className="flex flex-1 px-4 py-4 lg:px-6 lg:py-6">
      <div className="w-full">
        <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">
          Signed in as <span className="font-medium text-zinc-700">{user.email}</span>
        </p>
        <RaeOutputCard initialPayload={initialPayload} initialError={initialError} />
      </div>
    </div>
  );
}
