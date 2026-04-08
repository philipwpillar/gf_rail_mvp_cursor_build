import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildRaeRecommendation } from "@/lib/server/rae-recommendation";
import { renderToBuffer } from "@react-pdf/renderer";
import { PlanDocument } from "@/lib/pdf/PlanDocument";

export const runtime = "nodejs";
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
      writeAudit: false,
    });

    const document = PlanDocument({ payload });
    const buffer = await renderToBuffer(document);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="rail-plan-summary.pdf"',
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate plan PDF. Please try again." },
      { status: 500 },
    );
  }
}
