import type {
  DrugHit,
  IdeonPlanSearchResponse,
  PlanSearchInput,
  ProviderHit,
  ZipCounty,
} from './types'

/** Plan search is v8; zip_counties is only published through v6. */
const PLANS_VERSION = 'v8'
const ZIP_COUNTY_VERSION = 'v6'

/**
 * Provider and drug coverage is only returned by v7, and v7 also changes the
 * cost-share fields from objects to strings — see ideon/coverage.ts.
 */
const COVERAGE_VERSION = 'v7'

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
    ...(input.providers?.length ? { providers: input.providers.map((p) => ({ npi: p.npi })) } : {}),
    ...(input.drugs?.length ? { drug_packages: input.drugs.map((d) => ({ id: d.ndc })) } : {}),
  }
}

/** Coverage is only available on v7, so the version follows the request content. */
function planSearchVersion(input: PlanSearchInput): string {
  return input.providers?.length || input.drugs?.length ? COVERAGE_VERSION : PLANS_VERSION
}

export async function searchPlans(input: PlanSearchInput): Promise<IdeonPlanSearchResponse> {
  const path = `/plans/medical/search?page=${input.page}&per_page=${input.perPage}`
  return call<IdeonPlanSearchResponse>(path, planSearchVersion(input), {
    method: 'POST',
    body: planSearchBody(input),
  })
}

type DrugsResponse = {
  drugs?: {
    id?: string
    name?: string | null
    med_id?: number | null
    drug_packages?: {
      id?: string
      proprietary_name?: string | null
      non_proprietary_name?: string | null
      active_ingredient_strength?: string | null
    }[]
  }[]
}

/**
 * `require_formulary` is not optional in practice: without it Ideon returns parent
 * labels with a null `med_id` and no packages, which cannot drive a coverage check.
 */
export async function searchDrugs(term: string, limit = 15): Promise<DrugHit[]> {
  const path = `/drugs?search_term=${encodeURIComponent(term)}&require_formulary=true`
  const body = await call<DrugsResponse>(path, COVERAGE_VERSION, { method: 'GET' })
  const hits: DrugHit[] = []
  for (const drug of body.drugs ?? []) {
    if (typeof drug.med_id !== 'number' || !drug.name) continue
    hits.push({
      medId: drug.med_id,
      name: drug.name,
      packages: (drug.drug_packages ?? [])
        .filter((pkg): pkg is { id: string } => typeof pkg.id === 'string')
        .map((pkg) => ({ ndc: pkg.id, label: drug.name as string })),
    })
    if (hits.length >= limit) break
  }
  return hits
}

type ProvidersResponse = {
  providers?: {
    id?: number
    npis?: number[]
    presentation_name?: string | null
    specialty?: string | null
    type?: string | null
    addresses?: { city?: string | null }[]
  }[]
}

const NEAR_RADIUS_MILES = 25
const WIDE_RADIUS_MILES = 100

async function providersWithin(
  zip: string,
  term: string,
  radiusMiles: number,
  limit: number,
): Promise<ProviderHit[]> {
  const body = await call<ProvidersResponse>('/providers/search', COVERAGE_VERSION, {
    method: 'POST',
    body: {
      zip_code: zip,
      radius_miles: radiusMiles,
      page: 1,
      per_page: limit,
      search_term: term,
    },
  })
  return (body.providers ?? [])
    .map((p) => {
      // There is no `npi` field — the identifier lives in `id` / `npis[0]`.
      const npi = p.id ?? p.npis?.[0]
      if (typeof npi !== 'number' || !p.presentation_name) return null
      return {
        npi,
        name: p.presentation_name,
        specialty: p.specialty ?? null,
        type: p.type ?? null,
        city: p.addresses?.[0]?.city ?? null,
      }
    })
    .filter((p): p is ProviderHit => p !== null)
}

/** Widens to 100 miles only when the near pass finds nothing — rural zips need it. */
export async function searchProviders(
  zip: string,
  term: string,
  limit = 15,
): Promise<ProviderHit[]> {
  const near = await providersWithin(zip, term, NEAR_RADIUS_MILES, limit)
  if (near.length > 0) return near
  return providersWithin(zip, term, WIDE_RADIUS_MILES, limit)
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
