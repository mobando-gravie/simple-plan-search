import type { PricedPlan, SearchResult } from './planSearch'
import type { FetchPlansResponse, ShoppingPlan } from '../shopping/types'

export type PlanComparison = {
  hiosPlanId: string
  carrierName: string | null
  metalLevel: string | null
  ideonPremiumCents: number | null
  finalPremiumCents: number | null
  shoppingPremiumCents: number | null
  /** final (Ideon + Gravie modifier) − shopping. Null when either side is unpriced. */
  deltaCents: number | null
  deltaPct: number | null
  withinTolerance: boolean
  modifierId: number | null
  /** Field-level mismatches outside premium, e.g. metal level or HSA eligibility. */
  attributeMismatches: string[]
}

export type CompareReport = {
  matched: PlanComparison[]
  onlyInOurs: PricedPlan[]
  onlyInShopping: ShoppingPlan[]
  summary: {
    matchedCount: number
    withinTolerance: number
    overTolerance: number
    unpricedEitherSide: number
    onlyInOursCount: number
    onlyInShoppingCount: number
    medianAbsDeltaCents: number | null
    maxAbsDeltaCents: number | null
  }
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
}

function attributeMismatches(ours: PricedPlan, theirs: ShoppingPlan): string[] {
  const out: string[] = []
  const ourMetal = ours.metalLevel?.toLowerCase() ?? null
  const theirMetal = theirs.metalLevel?.toLowerCase() ?? null
  if (ourMetal && theirMetal && ourMetal !== theirMetal) {
    out.push(`metal ${ourMetal} vs ${theirMetal}`)
  }
  const ourType = ours.planType?.toUpperCase() ?? null
  const theirType = theirs.planType?.toUpperCase() ?? null
  if (ourType && theirType && ourType !== theirType) {
    out.push(`type ${ourType} vs ${theirType}`)
  }
  if (typeof theirs.hsaEligible === 'boolean' && theirs.hsaEligible !== ours.hsaEligible) {
    out.push(`hsa ${ours.hsaEligible} vs ${theirs.hsaEligible}`)
  }
  const ourDeductible = ours.deductibleIndividualCents
  const theirDeductible = theirs.deductibleIndividualCents
  if (
    typeof ourDeductible === 'number' &&
    typeof theirDeductible === 'number' &&
    ourDeductible !== theirDeductible
  ) {
    out.push(`deductible ${ourDeductible} vs ${theirDeductible}`)
  }
  return out
}

export function compare(
  ours: SearchResult,
  baseline: FetchPlansResponse,
  toleranceCents: number,
): CompareReport {
  const theirsByHios = new Map<string, ShoppingPlan>()
  for (const plan of baseline.plans ?? []) {
    if (plan.hiosPlanId) theirsByHios.set(plan.hiosPlanId, plan)
  }

  const matched: PlanComparison[] = []
  const onlyInOurs: PricedPlan[] = []
  const seen = new Set<string>()

  for (const ourPlan of ours.plans) {
    const theirPlan = theirsByHios.get(ourPlan.hiosPlanId)
    if (!theirPlan) {
      onlyInOurs.push(ourPlan)
      continue
    }
    seen.add(ourPlan.hiosPlanId)

    const theirCents = theirPlan.premiumCents ?? null
    const ourCents = ourPlan.finalPremiumCents
    const comparable = typeof theirCents === 'number' && typeof ourCents === 'number'
    const deltaCents = comparable ? ourCents - theirCents : null

    matched.push({
      hiosPlanId: ourPlan.hiosPlanId,
      carrierName: ourPlan.carrierName,
      metalLevel: ourPlan.metalLevel,
      ideonPremiumCents: ourPlan.ideonPremiumCents,
      finalPremiumCents: ourCents,
      shoppingPremiumCents: theirCents,
      deltaCents,
      deltaPct:
        deltaCents !== null && theirCents !== null && theirCents !== 0
          ? (deltaCents / theirCents) * 100
          : null,
      withinTolerance: deltaCents !== null && Math.abs(deltaCents) <= toleranceCents,
      modifierId: ourPlan.modifierId,
      attributeMismatches: attributeMismatches(ourPlan, theirPlan),
    })
  }

  const onlyInShopping = (baseline.plans ?? []).filter(
    (p) => p.hiosPlanId && !seen.has(p.hiosPlanId),
  )

  const deltas = matched
    .map((m) => m.deltaCents)
    .filter((d): d is number => d !== null)
    .map(Math.abs)

  return {
    matched,
    onlyInOurs,
    onlyInShopping,
    summary: {
      matchedCount: matched.length,
      withinTolerance: matched.filter((m) => m.withinTolerance).length,
      overTolerance: matched.filter((m) => m.deltaCents !== null && !m.withinTolerance).length,
      unpricedEitherSide: matched.filter((m) => m.deltaCents === null).length,
      onlyInOursCount: onlyInOurs.length,
      onlyInShoppingCount: onlyInShopping.length,
      medianAbsDeltaCents: median(deltas),
      maxAbsDeltaCents: deltas.length > 0 ? Math.max(...deltas) : null,
    },
  }
}
