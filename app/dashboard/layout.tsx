import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "./components/dashboard-shell";
import { parseSurplusDeltaCookie } from "@/lib/server/scenario";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const cookieStore = await cookies();
  const initialSidebarCollapsed = cookieStore.get("rail.sidebar.collapsed")?.value === "true";
  const initialSurplusDeltaPence = parseSurplusDeltaCookie(
    cookieStore.get("rail.scenario.surplus_delta")?.value,
  );

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
    <DashboardShell
      householdName={householdName}
      initialSidebarCollapsed={initialSidebarCollapsed}
      initialSurplusDeltaPence={initialSurplusDeltaPence}
    >
      {children}
    </DashboardShell>
  );
}

