import type { IdeonPlanSearchResponse, PlanSearchInput, ZipCounty } from './types'

/** Plan search is v8; zip_counties is only published through v6. */
const PLANS_VERSION = 'v8'
const ZIP_COUNTY_VERSION = 'v6'

function config() {
  const apiKey = process.env.IDEON_API_KEY
  const baseUrl = process.env.IDEON_BASE_URL
  if (!apiKey) throw new Error('IDEON_API_KEY must be set')
  if (!baseUrl) throw new Error('IDEON_BASE_URL must be set')
  return { apiKey, baseUrl: baseUrl.replace(/\/$/, '') }
}

async function call<T>(
  path: string,
  version: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<T> {
  const { apiKey, baseUrl } = config()
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method,
    headers: {
      'Vericred-Api-Key': apiKey,
      Accept: 'application/json',
      'Accept-Version': version,
      // Cloudflare 1010-bans some default agents; curl's UA is what the API expects.
      'User-Agent': 'curl/8.4.0',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500)
    throw new Error(`Ideon ${init.method} ${path} → ${response.status}: ${detail}`)
  }
  return (await response.json()) as T
}

/** The exact body Ideon expects. Also the canonical form the cache key hashes. */
export function planSearchBody(input: PlanSearchInput): Record<string, unknown> {
  return {
    zip_code: input.zipCode,
    fips_code: input.fipsCode,
    market: input.market,
    per_page: input.perPage,
    page: input.page,
    sort: input.sort,
    ...(input.applicants.length > 0 ? { applicants: input.applicants } : {}),
    ...(input.enrollmentDate ? { enrollment_date: input.enrollmentDate } : {}),
    ...(input.householdIncome !== undefined ? { household_income: input.householdIncome } : {}),
    ...(input.householdSize !== undefined ? { household_size: input.householdSize } : {}),
  }
}

export async function searchPlans(input: PlanSearchInput): Promise<IdeonPlanSearchResponse> {
  const path = `/plans/medical/search?page=${input.page}&per_page=${input.perPage}`
  return call<IdeonPlanSearchResponse>(path, PLANS_VERSION, {
    method: 'POST',
    body: planSearchBody(input),
  })
}

type ZipCountyResponse = {
  counties?: { id?: number; fips_code?: string; name?: string; state_code?: string }[]
  zip_codes?: { id?: number; code?: string }[]
  zip_counties?: { zip_code_id?: number; county_id?: number }[]
}

/**
 * `/zip_counties` sideloads: `zip_counties` is a join table pointing at `zip_codes`
 * and `counties`. A zip spanning several counties resolves to the first.
 */
export async function lookupZipCounty(zip: string): Promise<ZipCounty> {
  const body = await call<ZipCountyResponse>(
    `/zip_counties?zip_prefix=${encodeURIComponent(zip)}`,
    ZIP_COUNTY_VERSION,
    { method: 'GET' },
  )

  const zipCode = body.zip_codes?.find((z) => z.code === zip)
  if (!zipCode) throw new Error(`Ideon has no zip code ${zip}`)

  const countyIds = (body.zip_counties ?? [])
    .filter((zc) => zc.zip_code_id === zipCode.id)
    .map((zc) => zc.county_id)
  const first = (body.counties ?? []).find((c) => countyIds.includes(c.id))
  if (!first?.fips_code || !first.state_code) {
    throw new Error(`Ideon has no county for zip ${zip}`)
  }
  return { fipsCode: first.fips_code, state: first.state_code, countyName: first.name ?? null }
}
