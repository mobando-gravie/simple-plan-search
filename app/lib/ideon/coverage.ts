import { parseCurrencyToCents } from '../money'
import type { CostShare, IdeonCoverage, IdeonPlan } from './types'

/**
 * Ideon reports a cost share two ways depending on the API version: v8 as an
 * object, v7 as one string ("In-Network: $6,000 / Out-of-Network: Not Covered").
 * A v8-only reader silently yields null deductibles the moment a search attaches
 * providers or drugs, because that switches the request to v7.
 */
export function inNetworkCostShare(share: CostShare | undefined): string | null {
  if (share === null || share === undefined) return null
  if (typeof share !== 'string') return share.in_network
  const match = /In-Network:\s*([^/]+)/i.exec(share)
  return (match ? match[1] : share).trim()
}

export function inNetworkCents(share: CostShare | undefined): number | null {
  return parseCurrencyToCents(inNetworkCostShare(share))
}

/**
 * Ideon reports an off-formulary drug as a tier rather than omitting it, and uses
 * three distinct values for it. Mirrors member-client's `not-covered-statuses`
 * (ichra/plan_selection/utils.cljs:3) — an earlier version of this set here was
 * missing `no_coverage`, so those drugs counted as covered.
 */
const UNCOVERED_TIERS = new Set(['no_coverage', 'not_listed', 'not_covered'])

export function isCoveredTier(tier: string | null | undefined): boolean {
  return typeof tier === 'string' && tier !== '' && !UNCOVERED_TIERS.has(tier)
}

export type ProviderCoverage = { npi: number; inNetwork: boolean }

export type DrugCoverage = {
  ndc: string
  tier: string | null
  covered: boolean
  priorAuthorization: boolean
  quantityLimit: boolean
}

export type PlanCoverage = { providers: ProviderCoverage[]; drugs: DrugCoverage[] }

/**
 * Drug coverage is response-level and joined to plans by `plan_id`. Deduped on
 * (plan, package) because Ideon repeats a plan's coverage rows on *every* page of
 * a paged search, so merging pages would otherwise multiply the denominator.
 */
export function coveragesByPlan(coverages: IdeonCoverage[] = []): Map<string, IdeonCoverage[]> {
  const byPlan = new Map<string, Map<string, IdeonCoverage>>()
  for (const coverage of coverages) {
    if (!coverage.plan_id || !coverage.drug_package_id) continue
    const forPlan = byPlan.get(coverage.plan_id) ?? new Map<string, IdeonCoverage>()
    forPlan.set(coverage.drug_package_id, coverage)
    byPlan.set(coverage.plan_id, forPlan)
  }
  return new Map([...byPlan].map(([planId, packages]) => [planId, [...packages.values()]]))
}

export function planCoverage(plan: IdeonPlan, drugCoverages: IdeonCoverage[] = []): PlanCoverage {
  return {
    providers: (plan.providers ?? [])
      .filter((p): p is { npi: number; in_network?: boolean | null } => typeof p.npi === 'number')
      .map((p) => ({ npi: p.npi, inNetwork: p.in_network === true })),
    drugs: drugCoverages
      .filter((c): c is IdeonCoverage & { drug_package_id: string } => !!c.drug_package_id)
      .map((c) => ({
        ndc: c.drug_package_id,
        tier: c.tier ?? null,
        covered: isCoveredTier(c.tier),
        priorAuthorization: c.prior_authorization === true,
        quantityLimit: c.quantity_limit === true,
      })),
  }
}

/**
 * Three states, matching member-client's `coverage-match-class`. A boolean would
 * render "1 of 3 covered" identically to "0 of 3".
 */
export type CoverageMatch = 'match' | 'partial' | 'none'

export function coverageMatch(covered: number, total: number): CoverageMatch {
  if (total > 0 && covered === total) return 'match'
  return covered === 0 ? 'none' : 'partial'
}
