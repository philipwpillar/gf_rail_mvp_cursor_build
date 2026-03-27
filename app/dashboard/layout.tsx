import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./components/sidebar";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: household } = await supabase
    .from("household_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle<{ display_name: string | null }>();

  const householdName = household?.display_name ?? "Household";

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
      <div className="grid min-h-[760px] grid-cols-1 lg:grid-cols-[260px_1fr]">
        <Sidebar
          isCollapsed={false}
          onToggle={() => {
            // Sidebar collapse is handled client-side within the component.
          }}
          householdName={householdName}
        />
        <section className="bg-zinc-50 p-5">{children}</section>
      </div>
    </div>
  );
}

