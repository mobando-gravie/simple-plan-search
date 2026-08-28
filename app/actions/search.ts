'use server'
import type { Household } from '@/app/lib/household'
import { searchPlans, type SearchCriteria, DEFAULT_CRITERIA } from '@/app/lib/services/planSearch'
import type { PricedPlan } from '@/app/lib/services/planSearch'

export type SearchState = {
  error?: string
  criteria?: SearchCriteria
  plans?: PricedPlan[]
  meta?: {
    total: number
    fipsCode: string
    state: string
    countyName: string | null
    modifiersApplied: number
  }
  cache?: { hit: boolean; fetchedAt: string; ageSeconds: number }
}

const MAX_AGE = 120

/** null when absent or not a whole age in range — the caller decides if that's fatal. */
function age(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 && n <= MAX_AGE ? n : null
}

function optionalNumber(raw: FormDataEntryValue | null): number | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

export async function runSearch(_state: SearchState, formData: FormData): Promise<SearchState> {
  const zipCode = String(formData.get('zipCode') ?? '').trim()
  if (!/^\d{5}$/.test(zipCode)) {
    return { error: 'Enter a 5-digit ZIP code.' }
  }

  const memberAge = age(formData.get('memberAge'))
  if (memberAge === null) {
    return { error: `Enter the member's age (0–${MAX_AGE}).` }
  }

  const spouseRaw = formData.get('spouseAge')
  const spousePresent = typeof spouseRaw === 'string'
  const spouseAge = age(spouseRaw)
  if (spousePresent && spouseAge === null) {
    return { error: `Enter the spouse's age (0–${MAX_AGE}), or remove the spouse.` }
  }

  const childAges = formData.getAll('childAge').map(age)
  const badChild = childAges.indexOf(null)
  if (badChild >= 0) {
    return { error: `Enter an age (0–${MAX_AGE}) for child ${badChild + 1}, or remove them.` }
  }

  const household: Household = {
    member: { age: memberAge, tobacco: formData.get('memberTobacco') === 'on' },
    spouse:
      spouseAge === null
        ? null
        : { age: spouseAge, tobacco: formData.get('spouseTobacco') === 'on' },
    children: (childAges as number[]).map((childAge) => ({ age: childAge })),
  }

  const criteria: SearchCriteria = {
    ...DEFAULT_CRITERIA,
    zipCode,
    household,
    householdIncome: optionalNumber(formData.get('householdIncome')),
    enrollmentDate: String(formData.get('enrollmentDate') ?? '').trim() || undefined,
    perPage: optionalNumber(formData.get('perPage')) ?? 50,
  }

  try {
    const result = await searchPlans(criteria, { refresh: formData.get('refresh') === 'true' })
    return {
      criteria,
      plans: result.plans,
      meta: result.meta,
      cache: {
        hit: result.cache.hit,
        fetchedAt: result.cache.fetchedAt.toISOString(),
        ageSeconds: result.cache.ageSeconds,
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Search failed.' }
  }
}
