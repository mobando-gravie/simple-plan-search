import { lookupZipCounty, planSearchBody, searchPlans as ideonSearchPlans } from '../ideon/client'
import { mapPlan, type MappedPlan } from '../ideon/mapPlan'
import type { IdeonPlanSearchResponse, PlanSearchInput } from '../ideon/types'
import { firstOfNextMonth } from '../dates'
import { DEFAULT_HOUSEHOLD, householdSize, toApplicants, type Household } from '../household'
import { applyModifier, findModifier, IDENTITY, type GravieModifier } from '../modifier'
import { activeModifiers } from '../repos/modifierRepo'
import { cacheKeyFor, findCached, upsertCached } from '../repos/planCacheRepo'
import { findZipCounty, saveZipCounty } from '../repos/zipCountyRepo'

const DEFAULT_TTL_SECONDS = 86_400

/** Ideon caps a page at 50 however large per_page is, so more than that means paging. */
const IDEON_PAGE_SIZE = 50

function ttlSeconds(): number {
  const raw = Number(process.env.PLAN_CACHE_TTL_SECONDS)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_SECONDS
}

export type SearchCriteria = {
  zipCode: string
  household: Household
  householdIncome?: number
  enrollmentDate?: string
  perPage: number
  page: number
  sort: string
  market: 'individual' | 'small_group'
}

export type PricedPlan = MappedPlan & {
  gravieMultiplier: number
  gravieFlatCents: number
  finalPremiumCents: number | null
  modifierId: number | null
  modifierLabel: string | null
}

export type SearchResult = {
  plans: PricedPlan[]
  meta: {
    total: number
    fipsCode: string
    state: string
    countyName: string | null
    modifiersApplied: number
  }
  cache: { hit: boolean; fetchedAt: Date; ageSeconds: number }
}

export const DEFAULT_CRITERIA: SearchCriteria = {
  zipCode: '',
  household: DEFAULT_HOUSEHOLD,
  perPage: 200,
  page: 1,
  sort: 'premium:asc',
  market: 'individual',
}

/** Cached zip → FIPS. Ideon requires fips_code on every plan search. */
async function resolveZip(zip: string) {
  const cached = await findZipCounty(zip)
  if (cached) return cached
  const fresh = await lookupZipCounty(zip)
  await saveZipCounty(zip, fresh)
  return fresh
}

function priceWith(modifiers: GravieModifier[], plan: MappedPlan, state: string): PricedPlan {
  const match =
    plan.ideonPremiumCents === null
      ? null
      : findModifier(modifiers, {
          hiosPlanId: plan.hiosPlanId,
          carrierId: plan.carrierId,
          state,
          ratingArea: null,
          metalLevel: plan.metalLevel,
          effectiveYear: plan.effectiveYear,
        })
  const effective = match ?? IDENTITY
  return {
    ...plan,
    gravieMultiplier: effective.multiplier,
    gravieFlatCents: effective.flatCents,
    finalPremiumCents:
      plan.ideonPremiumCents === null ? null : applyModifier(plan.ideonPremiumCents, effective),
    modifierId: match?.id ?? null,
    modifierLabel: match?.label ?? null,
  }
}

/**
 * Walks Ideon's pages until `wanted` plans are collected or the result set runs
 * out. `meta` comes from the first page — it describes the whole result set, not
 * the slice.
 */
async function fetchPlans(
  input: PlanSearchInput,
  wanted: number,
): Promise<IdeonPlanSearchResponse> {
  const plans: IdeonPlanSearchResponse['plans'] = []
  let meta: IdeonPlanSearchResponse['meta'] = {}

  for (let page = 1; plans.length < wanted; page++) {
    const body = await ideonSearchPlans({ ...input, page, perPage: IDEON_PAGE_SIZE })
    if (page === 1) meta = body.meta ?? {}
    const batch = body.plans ?? []
    plans.push(...batch)
    if (batch.length < IDEON_PAGE_SIZE) break
  }

  return { plans: plans.slice(0, wanted), meta }
}

export async function searchPlans(
  criteria: SearchCriteria,
  opts: { refresh?: boolean } = {},
): Promise<SearchResult> {
  const county = await resolveZip(criteria.zipCode)

  const input: PlanSearchInput = {
    zipCode: criteria.zipCode,
    fipsCode: county.fipsCode,
    market: criteria.market,
    applicants: toApplicants(criteria.household),
    householdIncome: criteria.householdIncome,
    householdSize: householdSize(criteria.household),
    enrollmentDate: criteria.enrollmentDate ?? firstOfNextMonth(),
    page: criteria.page,
    perPage: criteria.perPage,
    sort: criteria.sort,
  }

  const request = planSearchBody(input)
  const cacheKey = cacheKeyFor(request)
  const cached = opts.refresh ? null : await findCached(cacheKey)

  const now = Date.now()
  const isFresh = cached !== null && (now - cached.fetchedAt.getTime()) / 1000 < ttlSeconds()

  let response: IdeonPlanSearchResponse
  let fetchedAt: Date
  let hit: boolean

  if (cached && isFresh) {
    response = cached.response
    fetchedAt = cached.fetchedAt
    hit = true
  } else {
    response = await fetchPlans(input, criteria.perPage)
    fetchedAt = new Date()
    hit = false
    await upsertCached({
      cacheKey,
      request,
      response,
      zipCode: criteria.zipCode,
      fipsCode: county.fipsCode,
      planCount: response.plans?.length ?? 0,
    })
  }

  const modifiers = await activeModifiers()
  const plans = (response.plans ?? [])
    .map(mapPlan)
    .map((plan) => priceWith(modifiers, plan, county.state))

  return {
    plans,
    meta: {
      total: response.meta?.total ?? plans.length,
      fipsCode: county.fipsCode,
      state: county.state,
      countyName: county.countyName,
      modifiersApplied: plans.filter((p) => p.modifierId !== null).length,
    },
    cache: {
      hit,
      fetchedAt,
      ageSeconds: Math.max(0, Math.round((now - fetchedAt.getTime()) / 1000)),
    },
  }
}
