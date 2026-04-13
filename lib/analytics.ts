/**
 * lib/analytics.ts
 *
 * Posthog analytics wrapper.
 * All calls are no-ops when NEXT_PUBLIC_POSTHOG_KEY is absent.
 * Events are named in snake_case to match Posthog convention.
 */
import posthog from "posthog-js";

let initialised = false;

export function initAnalytics(): void {
  if (initialised) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com";
  if (!key) return;
  posthog.init(key, { api_host: host, capture_pageview: false });
  initialised = true;
}

export function captureEvent(event: string, properties?: Record<string, unknown>): void {
  if (!initialised) return;
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, email?: string): void {
  if (!initialised) return;
  posthog.identify(userId, { email });
}
