/**
 * contracts/types.ts
 *
 * TypeScript types derived from contracts/openapi.yaml.
 *
 * These are manually maintained until a code-generation pipeline
 * (e.g. openapi-typescript) is introduced. Keep in sync with the YAML.
 *
 * Consumers: app/api/v1/rae/route.ts (producer), any future test client.
 */

import type { RAEResult } from "@/lib/rae/types";
import type { ProjectionResult } from "@/lib/rae/projections";
import type { RaeApiPayload } from "@/lib/server/rae-recommendation";

/** Metadata attached to every v1 API response. */
export type V1ResponseMeta = {
  request_id: string;
  engine_version: string;
  policy_version: string;
};

/** Standard error body for all v1 API error responses. */
export type V1ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: V1ResponseMeta;
};

/** Successful response body from GET /api/v1/rae. */
export type V1RaeResponse = {
  data: {
    result: RAEResult;
    projections: ProjectionResult;
    context: RaeApiPayload["context"];
    decision_id: string | null;
  };
  meta: V1ResponseMeta;
};
