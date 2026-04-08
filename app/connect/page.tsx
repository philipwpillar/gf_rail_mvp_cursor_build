import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConnectPage } from "./connect_page";

export const dynamic = "force-dynamic";

export default async function ConnectRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <ConnectPage />;
}
