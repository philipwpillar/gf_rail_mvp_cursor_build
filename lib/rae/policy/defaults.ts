/**
 * lib/rae/policy/defaults.ts
 *
 * The default Rail policy for UK direct deployment.
 *
 * All values match the thresholds previously compiled into the engine
 * TypeScript files. This is the canonical record of those values.
 *
 * To create a partner-specific override, spread DEFAULT_POLICY and
 * replace individual fields:
 *   const partnerPolicy: RailPolicy = { ...DEFAULT_POLICY, aprThreshold: 0.05 };
 *
 * Policy objects are immutable — never mutate DEFAULT_POLICY at runtime.
 *
 * Rule: zero database or network imports. Pure data only.
 */

import type { RailPolicy } from "./types";

export const DEFAULT_POLICY: RailPolicy = Object.freeze({
  version: "1.0.0",

  // Buffer
  bMinWeeks: 3,
  bTargetWeeks: 6,

  // Stage classification
  aprThreshold: 0.07,

  // Shock adjustment
  shockThreshold: 0.25,
  fragilityLambda: 1.5,
  shockDebtRedirectCap: 0.5,
  shockInvestmentRedirectCap: 0.5,

  // Debt sequencing
  avalancheThreshold: 0.6,
  avalancheWeight: 1.0,
  blendedAvalancheWeight: 0.7,
  blendedSnowballWeight: 0.3,
});
