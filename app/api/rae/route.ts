import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildRaeRecommendation } from "@/lib/server/rae-recommendation";

export const dynamic = "force-dynamic";

export async function GET() {
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
    });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Failed to load recommendation. Please try again." },
      { status: 500 },
    );
  }
}
