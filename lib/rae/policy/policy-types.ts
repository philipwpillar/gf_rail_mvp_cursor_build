/**
 * lib/rae/policy/types.ts
 *
 * RailPolicy is the single source of truth for every numeric threshold,
 * ratio, and rule that governs the Rail Allocation Engine.
 *
 * Policy objects are versioned and immutable within a version. Partners
 * receiving white-label deployments and regulated licensees receive their
 * own policy object — overriding thresholds at the policy layer rather
 * than in engine code.
 *
 * Rule: zero database or network imports. Pure types only.
 */

export interface RailPolicy {
  /** Semantic version of this policy configuration. Stored in rae_executions. */
  version: string;

  // Buffer thresholds
  /**
   * Weeks of total obligations (fixed + debt minimums) required for B_min.
   * B_min is the inviolable floor — the buffer must reach this before any
   * surplus flows to debt acceleration or investment. Default: 3.
   */
  bMinWeeks: number;

  /**
   * Weeks of total obligations required for B_target (full resilience).
   * Once buffer reaches B_target, Stage 2 or Stage 3 becomes eligible.
   * Default: 6.
   */
  bTargetWeeks: number;

  // Stage classification
  /**
   * APR threshold above which a debt is classified as "high-rate" and
   * triggers Stage 2 (Debt Elimination). Debts at or below this rate
   * are not considered high-rate. Default: 0.07 (7%).
   */
  aprThreshold: number;

  // Income shock adjustment
  /**
   * Income shock probability threshold. When incomeShockProbability
   * exceeds this value, the engine begins redirecting surplus to the
   * buffer. Default: 0.25.
   */
  shockThreshold: number;

  /**
   * Fragility weight applied to shock-period losses. Values > 1.0
   * reflect that a plan-breaking shock costs more than its nominal
   * monetary value. Default: 1.5.
   */
  fragilityLambda: number;

  /**
   * Maximum fraction of the debt allocation pool that can be redirected
   * to the buffer during a Stage 2 income shock. Default: 0.5.
   */
  shockDebtRedirectCap: number;

  /**
   * Maximum fraction of the investment pool that can be redirected
   * to the buffer during a Stage 3 income shock. Default: 0.5.
   */
  shockInvestmentRedirectCap: number;

  // Debt sequencing
  /**
   * Plan commitment score at or above which pure avalanche is used.
   * Below this threshold, blended avalanche/snowball is applied.
   * Default: 0.6.
   */
  avalancheThreshold: number;

  /**
   * Weight applied to the highest-APR debt in pure avalanche mode.
   * Should be 1.0 — all surplus to the highest-cost debt. Default: 1.0.
   */
  avalancheWeight: number;

  /**
   * Weight applied to the highest-APR debt in blended mode.
   * The remainder (1 - blendedAvalancheWeight) goes to the
   * smallest-balance debt (snowball component). Default: 0.7.
   */
  blendedAvalancheWeight: number;

  /**
   * Weight applied to the smallest-balance debt in blended mode
   * (the snowball component). Must equal 1 - blendedAvalancheWeight.
   * Default: 0.3.
   */
  blendedSnowballWeight: number;
}
