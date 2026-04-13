import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { email } = (await request.json()) as { email: string };
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: "Rail <onboarding@resend.dev>",
    to: email,
    subject: "Welcome to Rail",
    html: `
      <p>Hi,</p>
      <p>Your Rail account is ready. Complete your household profile to see your personalised financial plan.</p>
      <p><a href="https://gf-rail-mvp-cursor-build.vercel.app/onboarding">Get started</a></p>
      <p>Rail — Household CFO Platform</p>
      <p style="font-size:12px;color:#71717a;">This is not financial advice. Rail provides recommendations only.</p>
    `,
  });

  if (error) {
    console.error("Welcome email failed:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
