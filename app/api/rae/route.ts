/**
 * app/api/rae/route.ts
 *
 * Legacy endpoint — returns a 308 Permanent Redirect to /api/v1/rae.
 * Maintained for 6 months post-migration per the API versioning policy
 * (see docs/adr/003-api-versioning.md). Remove after 2026-10-21.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace("/api/rae", "/api/v1/rae");
  return NextResponse.redirect(url.toString(), { status: 308 });
}
