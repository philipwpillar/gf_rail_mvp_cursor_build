import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { RaeOutputCard } from "./rae-output-card";
import { buildRaeRecommendation, type RaeApiPayload } from "@/lib/server/rae-recommendation";
import { parseSurplusDeltaCookie } from "@/lib/server/scenario";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const cookieStore = await cookies();
  const surplusDeltaPence = parseSurplusDeltaCookie(cookieStore.get("rail.scenario.surplus_delta")?.value);
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
      surplusDeltaPence,
    });
  } catch {
    initialError = "We could not load your recommendation just now. Please refresh.";
  }

  return (
    <div className="flex flex-1 px-4 py-4 lg:px-6 lg:py-6">
      <div className="w-full">
        <p className="mb-3 type-label text-zinc-500">
          Signed in as <span className="font-medium text-zinc-700">{user.email}</span>
        </p>
        <RaeOutputCard initialPayload={initialPayload} initialError={initialError} />
      </div>
    </div>
  );
}
