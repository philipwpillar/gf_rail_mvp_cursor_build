import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RaeOutputCard } from "./rae-output-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: household, error: householdError } = await supabase
    .from("household_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  // TODO(Stage 7): replace this placeholder with the real dashboard UI (sidebar, pipeline status, allocation card, rationale).
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600">
          You’re signed in as <span className="font-medium">{user.email}</span>.
        </p>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Sanity check (RLS + session cookie)
          </p>
          <div className="mt-2 text-sm">
            {householdError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                Failed to load household profile: {householdError.message}
              </div>
            ) : household?.display_name ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                Household:{" "}
                <span className="font-semibold">{household.display_name}</span>
              </div>
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                No household profile row found for this user yet.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-700">
            Stage 6 wiring is now live: this dashboard calls <code>/api/rae</code>,
            which maps Supabase household/debt data into a pure{" "}
            <code>runRAE</code> execution.
          </p>
        </div>

        <RaeOutputCard />
      </div>
    </div>
  );
}

