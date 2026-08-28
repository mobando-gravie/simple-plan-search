import type { Household } from '../household'
import type { FetchPlansResponse, ShoppingPlan } from './types'

/**
 * ichra-shopping's `POST /plans/hotwire-ranked` — the ranking endpoint that takes
 * the whole household in the body, so no persisted interview is needed. Its
 * premiums come from IMPC rate cards (Method A tiered / Method B age-banded),
 * which is what makes them an independent check on ours.
 */
const PATH = '/plans/hotwire-ranked'

/** Both Content-Type and Accept; a plain application/json Accept gets a 406. */
const MEDIA_TYPE = 'application/vnd.ichra-shopping.v1+json'

export type HotwireResult = {
  response: FetchPlansResponse
  /**
   * Plans shopping returned but could not price. It ships them as premiumCents 0
   * rather than dropping them, so they are filtered here — left in, each would
   * read as a several-hundred-dollar delta. A count equal to the plan total means
   * the rate back-fill never fired; check that effectiveDate is set.
   */
  droppedUnpriced: number
  employerContributionCents: number
  householdSize: number | null
}

/**
 * The scoring inputs are required by the schema but move only the ranking and the
 * echoed allowance — never the premium — so the diff sends inert values.
 */
const INERT_INTAKE = {
  costPreference: 'BALANCED',
  careNeeds: 'OCCASIONAL_CHECKUPS',
  renewalPreference: 'NOT_SURE',
} as const

export type HotwirePayloadInput = {
  household: Household
  zipCode: string
  fipsCode: string
  /** YYYY-MM-DD. Feeds both date fields — they are different types and both matter. */
  coverageDate: string
  allowanceCents?: number
}

export function hotwirePayload(input: HotwirePayloadInput): Record<string, unknown> {
  const { household } = input
  return {
    intake: { ...INERT_INTAKE, ichraAllowanceCents: input.allowanceCents ?? 0 },
    planSearch: {
      memberZipCode: input.zipCode,
      memberCountyFipsCode: input.fipsCode,
      // Anchors the catalog and rate-card query.
      requestedCoverageDate: input.coverageDate,
    },
    // Distinct from requestedCoverageDate and not optional in practice: without it
    // the rate back-fill is skipped and every premium comes back 0.
    effectiveDate: `${input.coverageDate}T00:00:00Z`,
    applicantAge: household.member.age,
    applicantTobaccoUser: household.member.tobacco,
    spouse: household.spouse
      ? { age: household.spouse.age, tobaccoUser: household.spouse.tobacco }
      : null,
    children: household.children.map((child) => ({ age: child.age, tobaccoUser: false })),
  }
}

type RankedEntry = { plan?: Partial<ShoppingPlan> & { hiosPlanId?: string } }

/** Flattens recommendedPlans[].plan into the flat shape the comparator expects. */
export function coerceHotwireResponse(body: unknown): HotwireResult {
  if (!body || typeof body !== 'object') {
    throw new Error('hotwire response is not an object')
  }
  const obj = body as Record<string, unknown>
  if (!Array.isArray(obj.recommendedPlans)) {
    throw new Error('hotwire response has no `recommendedPlans` array')
  }

  const plans: ShoppingPlan[] = []
  let droppedUnpriced = 0

  for (const entry of obj.recommendedPlans as RankedEntry[]) {
    const plan = entry?.plan
    if (!plan?.hiosPlanId) continue
    if (!plan.premiumCents) {
      droppedUnpriced++
      continue
    }
    plans.push(plan as ShoppingPlan)
  }

  return {
    response: {
      plans,
      householdSize: typeof obj.householdSize === 'number' ? obj.householdSize : null,
    },
    droppedUnpriced,
    employerContributionCents:
      typeof obj.employerContributionCents === 'number' ? obj.employerContributionCents : 0,
    householdSize: typeof obj.householdSize === 'number' ? obj.householdSize : null,
  }
}

export async function fetchHotwireBaseline(
  baseUrl: string,
  payload: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<HotwireResult> {
  const url = `${baseUrl.replace(/\/$/, '')}${PATH}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': MEDIA_TYPE, Accept: MEDIA_TYPE, ...headers },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300)
    throw new Error(`hotwire POST ${url} → ${response.status}: ${detail}`)
  }
  return coerceHotwireResponse(await response.json())
}
