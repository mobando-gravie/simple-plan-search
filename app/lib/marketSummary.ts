import { countCovered, countInNetwork } from './ideon/coverage'
import type { SelectedDrug, SelectedProvider } from './ideon/types'
import { METAL_LEVELS } from './metal'
import type { PricedPlan } from './services/planSearch'

/**
 * What a market looks like in aggregate — the question "what is available in this
 * zip" rather than "which plan should I take". planFilter's filterOptions lists
 * the distinct values; this counts and prices them.
 */

export type Spread = {
  lowestCents: number | null
  medianCents: number | null
  highestCents: number | null
}

/** Nulls are dropped rather than counted as zero — an unpriced plan carries no signal. */
export function spread(values: (number | null)[]): Spread {
  const sorted = values.filter((v): v is number => v !== null).sort((a, b) => a - b)
  if (sorted.length === 0) return { lowestCents: null, medianCents: null, highestCents: null }
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
  return {
    lowestCents: sorted[0],
    medianCents: median,
    highestCents: sorted[sorted.length - 1],
  }
}

type Group = { planCount: number; lowestPremiumCents: number | null }

function groupBy(plans: PricedPlan[], keyOf: (plan: PricedPlan) => string | null) {
  const groups = new Map<string, PricedPlan[]>()
  for (const plan of plans) {
    const key = keyOf(plan)
    if (key === null) continue
    groups.set(key, [...(groups.get(key) ?? []), plan])
  }
  return groups
}

function summarise(plans: PricedPlan[]): Group {
  return {
    planCount: plans.length,
    lowestPremiumCents: spread(plans.map((p) => p.finalPremiumCents)).lowestCents,
  }
}

const METAL_ORDER = new Map(METAL_LEVELS.map((level, index) => [level as string, index]))

/** Metals read in benefit order; everything else reads biggest first. */
function byMetalOrder(a: string, b: string): number {
  const ai = METAL_ORDER.get(a) ?? METAL_LEVELS.length
  const bi = METAL_ORDER.get(b) ?? METAL_LEVELS.length
  return ai === bi ? a.localeCompare(b) : ai - bi
}

function byCountThenName(
  a: readonly [string, { planCount: number }],
  b: readonly [string, { planCount: number }],
): number {
  return b[1].planCount - a[1].planCount || a[0].localeCompare(b[0])
}

function coverageSummary(
  plans: PricedPlan[],
  providers: SelectedProvider[],
  drugs: SelectedDrug[],
) {
  if (providers.length === 0 && drugs.length === 0) return null
  const allProviders = (plan: PricedPlan) =>
    providers.length > 0 && countInNetwork(providers, plan.coverage) === providers.length
  const allDrugs = (plan: PricedPlan) =>
    drugs.length > 0 && countCovered(drugs, plan.coverage) === drugs.length
  return {
    providersRequested: providers.length,
    drugsRequested: drugs.length,
    plansCoveringAllProviders: plans.filter(allProviders).length,
    plansCoveringAllDrugs: plans.filter(allDrugs).length,
    plansCoveringEverything: plans.filter(
      (plan) =>
        (providers.length === 0 || allProviders(plan)) && (drugs.length === 0 || allDrugs(plan)),
    ).length,
  }
}

export function marketSummary(
  plans: PricedPlan[],
  selected: { providers: SelectedProvider[]; drugs: SelectedDrug[] },
) {
  return {
    planCount: plans.length,
    hsaEligibleCount: plans.filter((p) => p.hsaEligible).length,
    premium: spread(plans.map((p) => p.finalPremiumCents)),
    deductibleIndividual: spread(plans.map((p) => p.deductibleIndividualCents)),
    metalLevels: [...groupBy(plans, (p) => p.metalLevel)]
      .sort((a, b) => byMetalOrder(a[0], b[0]))
      .map(([level, group]) => ({ level, ...summarise(group) })),
    carriers: [...groupBy(plans, (p) => p.carrierName)]
      .map(
        ([name, group]) => [name, { carrierId: group[0].carrierId, ...summarise(group) }] as const,
      )
      .sort(byCountThenName)
      .map(([name, group]) => ({ name, ...group })),
    planTypes: [...groupBy(plans, (p) => p.planType)]
      .map(([type, group]) => [type, summarise(group)] as const)
      .sort(byCountThenName)
      .map(([type, group]) => ({ type, ...group })),
    coverage: coverageSummary(plans, selected.providers, selected.drugs),
  }
}
