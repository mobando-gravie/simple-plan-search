import { firstOfNextMonth } from '../dates'
import { householdMembers } from '../household'
import { countCovered, countInNetwork, coverageMatch } from '../ideon/coverage'
import type { SelectedDrug, SelectedProvider } from '../ideon/types'
import { netPremiumCents } from '../money'
import {
  ADDITIONAL_COVERAGES,
  benefitValues,
  CARE_SERVICES,
  formatTier,
  PRESCRIPTION_COVERAGE,
} from '../planBenefits'
import type { PlanFilterState } from '../planFilter'
import type { PricedPlan, SearchCriteria, SearchResult } from '../services/planSearch'
import type { ApiView } from './query'

/**
 * Shapes a priced plan for JSON. Money stays integer cents with a `Cents` suffix,
 * as everywhere past the Ideon mapper — the guide shows the `jq` divide.
 */

export type Selections = {
  providers: SelectedProvider[]
  drugs: SelectedDrug[]
  allowanceCents: number
}

export function selectionsOf(criteria: SearchCriteria): Selections {
  return {
    providers: criteria.providers,
    drugs: criteria.drugs,
    allowanceCents: criteria.allowanceCents ?? 0,
  }
}

/** What the caller actually asked, after defaults and validation. */
export function describeQuery(
  criteria: SearchCriteria,
  filters: PlanFilterState,
  options: { view: ApiView; limit: number },
) {
  return {
    zip: criteria.zipCode,
    market: criteria.market,
    household: householdMembers(criteria.household),
    householdIncome: criteria.householdIncome ?? null,
    allowanceCents: criteria.allowanceCents ?? null,
    enrollmentDate: criteria.enrollmentDate ?? firstOfNextMonth(),
    providers: criteria.providers.map((p) => ({ npi: p.npi, name: p.name })),
    drugs: criteria.drugs.map((d) => ({
      medId: d.medId,
      ndc: d.ndc,
      rxcui: d.rxcui ?? null,
      name: d.name,
    })),
    filters: {
      search: filters.search,
      metalLevels: filters.metalLevels,
      planTypes: filters.planTypes,
      carriers: filters.carriers,
      hsaOnly: filters.hsaOnly,
      maxPremiumCents: filters.maxPremiumCents,
      maxDeductibleCents: filters.maxDeductibleCents,
      providerCoverage: filters.providerCoverage,
      drugCoverage: filters.drugCoverage,
      sort: filters.sort,
    },
    view: options.view,
    limit: options.limit,
  }
}

/**
 * `totalAvailable` is what Ideon says exists, `fetched` what the search pulled,
 * `matched` what survived the filters, `returned` what is in this response.
 */
export function marketBlock(
  result: SearchResult,
  counts: { matched: number; returned: number },
) {
  return {
    fipsCode: result.meta.fipsCode,
    state: result.meta.state,
    countyName: result.meta.countyName,
    totalAvailable: result.meta.total,
    fetched: result.plans.length,
    matched: counts.matched,
    returned: counts.returned,
    modifiersApplied: result.meta.modifiersApplied,
  }
}

export function cacheBlock(result: SearchResult) {
  return {
    hit: result.cache.hit,
    fetchedAt: result.cache.fetchedAt.toISOString(),
    ageSeconds: result.cache.ageSeconds,
  }
}

/** `match` is null when nothing was asked about — "none" would answer a question nobody put. */
function counted(covered: number, total: number) {
  return { covered, total, match: total === 0 ? null : coverageMatch(covered, total) }
}

function coverageCounts(plan: PricedPlan, s: Selections) {
  return {
    providerCoverage: counted(countInNetwork(s.providers, plan.coverage), s.providers.length),
    drugCoverage: counted(countCovered(s.drugs, plan.coverage), s.drugs.length),
  }
}

/**
 * Reads off the caller's own list, not off the rows Ideon returned: a provider or
 * drug with no row is not in network / not covered, and must not vanish from the
 * denominator.
 */
export function coverageDetail(plan: PricedPlan, s: Selections) {
  const byNpi = new Map(plan.coverage.providers.map((p) => [p.npi, p]))
  const byNdc = new Map(plan.coverage.drugs.map((d) => [d.ndc, d]))
  return {
    providers: s.providers.map((p) => ({
      npi: p.npi,
      name: p.name,
      specialty: p.specialty ?? null,
      city: p.city ?? null,
      inNetwork: byNpi.get(p.npi)?.inNetwork ?? false,
    })),
    drugs: s.drugs.map((d) => {
      const row = d.ndc === null ? undefined : byNdc.get(d.ndc)
      return {
        medId: d.medId,
        ndc: d.ndc,
        rxcui: d.rxcui ?? null,
        name: d.name,
        covered: row?.covered ?? false,
        tier: row?.tier ?? null,
        tierLabel: formatTier(row?.tier ?? null),
        priorAuthorization: row?.priorAuthorization ?? false,
        quantityLimit: row?.quantityLimit ?? false,
        stepTherapy: row?.stepTherapy ?? false,
      }
    }),
  }
}

export function planSummary(plan: PricedPlan, s: Selections) {
  return {
    hiosPlanId: plan.hiosPlanId,
    planName: plan.planName,
    carrierName: plan.carrierName,
    carrierId: plan.carrierId,
    metalLevel: plan.metalLevel,
    planType: plan.planType,
    hsaEligible: plan.hsaEligible,
    offMarket: plan.offMarket,
    effectiveYear: plan.effectiveYear,
    enrollmentType: plan.enrollmentType,
    premiumCents: plan.finalPremiumCents,
    ideonPremiumCents: plan.ideonPremiumCents,
    netPremiumCents:
      s.allowanceCents > 0 ? netPremiumCents(plan.finalPremiumCents, s.allowanceCents) : null,
    gravieMultiplier: plan.gravieMultiplier,
    gravieFlatCents: plan.gravieFlatCents,
    deductibleIndividualCents: plan.deductibleIndividualCents,
    deductibleFamilyCents: plan.deductibleFamilyCents,
    outOfPocketMaxIndividualCents: plan.outOfPocketMaxIndividualCents,
    outOfPocketMaxFamilyCents: plan.outOfPocketMaxFamilyCents,
    ...coverageCounts(plan, s),
  }
}

export function planFull(plan: PricedPlan, s: Selections) {
  return {
    ...planSummary(plan, s),
    logoUrl: plan.logoUrl,
    formularyUrl: plan.formularyUrl,
    documents: plan.documents,
    compositeRated: plan.compositeRated,
    applicantPremiums: plan.applicantPremiums,
    coverage: coverageDetail(plan, s),
    benefits: {
      careServices: benefitValues(plan.benefits, CARE_SERVICES),
      prescriptionCoverage: benefitValues(plan.benefits, PRESCRIPTION_COVERAGE),
      additionalCoverages: benefitValues(plan.benefits, ADDITIONAL_COVERAGES),
    },
  }
}

/** The coverage endpoint's row: enough plan identity to act on, then the answers. */
export function coverageRow(plan: PricedPlan, s: Selections) {
  return {
    hiosPlanId: plan.hiosPlanId,
    planName: plan.planName,
    carrierName: plan.carrierName,
    metalLevel: plan.metalLevel,
    premiumCents: plan.finalPremiumCents,
    ...coverageCounts(plan, s),
    ...coverageDetail(plan, s),
  }
}
