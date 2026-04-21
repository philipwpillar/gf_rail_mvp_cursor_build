/**
 * app/api/v1/rae/route.ts
 *
 * Rail Allocation Engine — versioned HTTP endpoint.
 *
 * GET /api/v1/rae
 *
 * Request headers:
 *   X-Request-Id      optional; server generates UUID v4 if absent
 *   Idempotency-Key   optional; enables 24h response caching
 *
 * Success response envelope:
 *   {
 *     data: { result, projections, context, decision_id },
 *     meta: { request_id, engine_version, policy_version }
 *   }
 *
 * Error response envelope:
 *   {
 *     error: { code, message },
 *     meta: { request_id }
 *   }
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildRaeRecommendation } from "@/lib/server/rae-recommendation";
import { parseSurplusDeltaCookie } from "@/lib/server/scenario";
import { checkIdempotencyCache, storeIdempotencyCache } from "@/lib/api/idempotency";
import { ENGINE_VERSION, extractRequestContext } from "@/lib/api/request-context";
import { DEFAULT_POLICY } from "@/lib/rae/policy/defaults";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { requestId } = extractRequestContext(request);

  // Structured log: request received
  console.log(JSON.stringify({ event: "rae.request", request_id: requestId }));

  const errorMeta = (responseBody: Record<string, unknown>, status = 500) =>
    NextResponse.json(responseBody, {
      status,
      headers: { "X-Request-Id": requestId },
    });

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return errorMeta({
      error: { code: "AUTH_ERROR", message: "Failed to verify authenticated user." },
      meta: { request_id: requestId },
    });
  }

  if (!user) {
    return errorMeta(
      {
        error: { code: "UNAUTHORIZED", message: "Unauthorized." },
        meta: { request_id: requestId },
      },
      401,
    );
  }

  // Idempotency check — return cached response if key was seen within TTL
  const idempotencyKey = request.headers.get("Idempotency-Key");
  const cached = await checkIdempotencyCache(supabase, user.id, idempotencyKey);
  if (cached) {
    console.log(
      JSON.stringify({
        event: "rae.idempotency_hit",
        request_id: requestId,
        idempotency_key: idempotencyKey,
      }),
    );
    return NextResponse.json(cached, {
      headers: { "X-Request-Id": requestId, "X-Idempotency-Cache": "HIT" },
    });
  }

  try {
    const cookieStore = await cookies();
    const surplusDeltaPence = parseSurplusDeltaCookie(
      cookieStore.get("rail.scenario.surplus_delta")?.value,
    );

    const payload = await buildRaeRecommendation({
      supabase,
      userId: user.id,
      userEmail: user.email,
      writeAudit: true,
      surplusDeltaPence,
      requestId,
    });

    const responseBody = {
      data: {
        result: payload.result,
        projections: payload.projections,
        context: payload.context,
        decision_id: payload.meta.executionId ?? null,
      },
      meta: {
        request_id: requestId,
        engine_version: ENGINE_VERSION,
        policy_version: DEFAULT_POLICY.version,
      },
    };

    // Structured log: request completed
    console.log(
      JSON.stringify({
        event: "rae.response",
        request_id: requestId,
        stage: payload.result.stage,
        audit_logged: payload.meta.auditLogged,
      }),
    );

    // Store for idempotency on the way out
    await storeIdempotencyCache(supabase, user.id, idempotencyKey, responseBody);

    return NextResponse.json(responseBody, {
      headers: { "X-Request-Id": requestId },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "rae.error",
        request_id: requestId,
        message: err instanceof Error ? err.message : "Unknown error",
      }),
    );
    return NextResponse.json(
      {
        error: {
          code: "ENGINE_ERROR",
          message: "Failed to compute recommendation. Please try again.",
        },
        meta: { request_id: requestId },
      },
      { status: 500, headers: { "X-Request-Id": requestId } },
    );
  }
}
