/**
 * lib/api/request-context.ts
 *
 * Request context extraction for the Rail v1 API.
 *
 * Extracts or generates the X-Request-Id for every inbound request.
 * The request_id is propagated into: response headers, response meta,
 * rae_executions rows, and structured log lines.
 *
 * Engine and policy version constants live here until Stage D (policy
 * extraction) introduces a dedicated policy module.
 */

import { randomUUID } from "crypto";

export type RequestContext = {
  requestId: string;
};

/** Current RAE engine version. Update when the engine contract changes. */
export const ENGINE_VERSION = "0.1.0" as const;

/**
 * Policy version stub. Will be replaced in Stage D (policy extraction)
 * when RailPolicy becomes a first-class versioned object.
 */
export const POLICY_VERSION = "default-v1" as const;

/**
 * Extracts X-Request-Id from the incoming request headers, or generates
 * a new UUID if the header is absent. The returned requestId must be
 * echoed back in the X-Request-Id response header and in response meta.
 */
export function extractRequestContext(request: Request): RequestContext {
  const requestId = request.headers.get("X-Request-Id") ?? randomUUID();
  return { requestId };
}
