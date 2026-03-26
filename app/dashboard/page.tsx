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
  return (
    <div className="flex flex-1 px-4 py-4 lg:px-6 lg:py-6">
      <div className="w-full">
        <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">
          Signed in as <span className="font-medium text-zinc-700">{user.email}</span>
        </p>
        <RaeOutputCard />
      </div>
    </div>
  );
}

