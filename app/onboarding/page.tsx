import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingPage } from "./onboarding_page";

export const dynamic = "force-dynamic";

export default async function OnboardingRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <OnboardingPage />;
}
