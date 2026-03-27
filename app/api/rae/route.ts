import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildRaeRecommendation } from "@/lib/server/rae-recommendation";
import { parseSurplusDeltaCookie } from "@/lib/server/scenario";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const surplusDeltaPence = parseSurplusDeltaCookie(cookieStore.get("rail.scenario.surplus_delta")?.value);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return NextResponse.json(
      { error: "Failed to verify authenticated user." },
      { status: 500 },
    );
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildRaeRecommendation({
      supabase,
      userId: user.id,
      userEmail: user.email,
      writeAudit: true,
      surplusDeltaPence,
    });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Failed to load recommendation. Please try again." },
      { status: 500 },
    );
  }
}
