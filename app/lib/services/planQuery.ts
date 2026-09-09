import { applyPlanFilters, type PlanFilterState } from '../planFilter'
import { labelSelections } from './entityLookup'
import {
  searchPlans,
  type PricedPlan,
  type SearchCriteria,
  type SearchResult,
} from './planSearch'

/**
 * Label → search → filter, the three calls every plan-bearing surface makes.
 * It lives here rather than in planSearch because planFilter already imports
 * PricedPlan from there.
 */
export type PlanQueryResult = {
  /** The criteria actually searched, with provider and drug names filled in. */
  criteria: SearchCriteria
  result: SearchResult
  /** Filtered and sorted; `result.plans` is the unfiltered set. */
  plans: PricedPlan[]
}

export async function runPlanQuery(
  criteria: SearchCriteria,
  filters: PlanFilterState,
  opts: { refresh?: boolean } = {},
): Promise<PlanQueryResult> {
  const labelled = { ...criteria, ...(await labelSelections(criteria)) }
  const result = await searchPlans(labelled, opts)
  const plans = applyPlanFilters(result.plans, filters, labelled.allowanceCents ?? 0, labelled)
  return { criteria: labelled, result, plans }
}
