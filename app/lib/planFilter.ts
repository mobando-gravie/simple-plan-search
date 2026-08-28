import type { PricedPlan } from './services/planSearch'

export type SortKey = 'premium' | 'deductible' | 'oopMax' | 'name'

export type PlanFilterState = {
  search: string
  metalLevels: string[]
  planTypes: string[]
  carriers: string[]
  hsaOnly: boolean
  maxPremiumCents: number | null
  maxDeductibleCents: number | null
  coversAllDrugs: boolean
  allProvidersInNetwork: boolean
  sort: SortKey
}

export const DEFAULT_FILTERS: PlanFilterState = {
  search: '',
  metalLevels: [],
  planTypes: [],
  carriers: [],
  hsaOnly: false,
  maxPremiumCents: null,
  maxDeductibleCents: null,
  coversAllDrugs: false,
  allProvidersInNetwork: false,
  sort: 'premium',
}

/** The distinct values present in a result set, for populating the controls. */
export function filterOptions(plans: PricedPlan[]) {
  const distinct = (values: (string | null)[]) =>
    [...new Set(values.filter((v): v is string => !!v))].sort()
  return {
    metalLevels: distinct(plans.map((p) => p.metalLevel)),
    planTypes: distinct(plans.map((p) => p.planType)),
    carriers: distinct(plans.map((p) => p.carrierName)),
  }
}

export function coversAllDrugs(plan: PricedPlan): boolean {
  const { drugs } = plan.coverage
  return drugs.length > 0 && drugs.every((d) => d.covered)
}

export function allProvidersInNetwork(plan: PricedPlan): boolean {
  const { providers } = plan.coverage
  return providers.length > 0 && providers.every((p) => p.inNetwork)
}

/** Unpriced plans sort last whichever direction is chosen — they carry no signal. */
function compareBy(key: SortKey, a: PricedPlan, b: PricedPlan): number {
  if (key === 'name') return a.planName.localeCompare(b.planName)
  const pick = (p: PricedPlan) =>
    key === 'premium'
      ? p.finalPremiumCents
      : key === 'deductible'
        ? p.deductibleIndividualCents
        : p.outOfPocketMaxIndividualCents
  const av = pick(a)
  const bv = pick(b)
  if (av === null && bv === null) return 0
  if (av === null) return 1
  if (bv === null) return -1
  return av - bv
}

export function applyPlanFilters(plans: PricedPlan[], f: PlanFilterState): PricedPlan[] {
  const needle = f.search.trim().toLowerCase()
  const kept = plans.filter((plan) => {
    if (needle) {
      const haystack = `${plan.planName} ${plan.carrierName} ${plan.hiosPlanId}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    if (f.metalLevels.length > 0 && !f.metalLevels.includes(plan.metalLevel ?? '')) return false
    if (f.planTypes.length > 0 && !f.planTypes.includes(plan.planType ?? '')) return false
    if (f.carriers.length > 0 && !f.carriers.includes(plan.carrierName)) return false
    if (f.hsaOnly && !plan.hsaEligible) return false
    // A null premium cannot be shown to satisfy a cap; treat it as failing.
    if (f.maxPremiumCents !== null) {
      if (plan.finalPremiumCents === null || plan.finalPremiumCents > f.maxPremiumCents) return false
    }
    if (f.maxDeductibleCents !== null) {
      const d = plan.deductibleIndividualCents
      if (d === null || d > f.maxDeductibleCents) return false
    }
    if (f.coversAllDrugs && !coversAllDrugs(plan)) return false
    if (f.allProvidersInNetwork && !allProvidersInNetwork(plan)) return false
    return true
  })
  return kept.sort((a, b) => compareBy(f.sort, a, b))
}
