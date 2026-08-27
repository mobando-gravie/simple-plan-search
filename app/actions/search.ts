'use server'
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
    householdSize: number
    modifiersApplied: number
  }
  cache?: { hit: boolean; fetchedAt: string; ageSeconds: number }
}

function ages(raw: FormDataEntryValue | null): number[] {
  if (typeof raw !== 'string' || raw.trim() === '') return []
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 120)
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

  const adultAges = ages(formData.get('adultAges'))
  if (adultAges.length === 0) {
    return { error: 'Enter at least one adult age.' }
  }

  const criteria: SearchCriteria = {
    ...DEFAULT_CRITERIA,
    zipCode,
    adultAges,
    childAges: ages(formData.get('childAges')),
    smoker: formData.get('smoker') === 'on',
    householdIncome: optionalNumber(formData.get('householdIncome')),
    householdSize: optionalNumber(formData.get('householdSize')),
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
