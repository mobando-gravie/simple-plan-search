import rawData from '../county/data/county-enrollment.json'

/**
 * FFM marketplace enrollment for a county from the CMS QHP detailed PUF (latest
 * year): the issuers that cover it and enrollee demographics. Pure over committed
 * data; the county name is baked in from the Census county file.
 */

type RawCounty = {
  state: string
  countyName: string | null
  total: number
  issuers: { issuerId: string; name: string; enrollment: number }[]
  demographics: Record<string, number>
}
export type CountyEnrollmentData = {
  planYear: number
  source: string
  generatedAt: string
  counties: Record<string, RawCounty>
}

export const COUNTY_DATA = rawData as CountyEnrollmentData

export type CountyLandscape = { fips: string; planYear: number } & RawCounty

export function countyLandscape(fips: string): CountyLandscape | null {
  const f = fips.trim()
  const c = COUNTY_DATA.counties[f]
  if (!c) return null
  return { fips: f, planYear: COUNTY_DATA.planYear, ...c }
}

export const COUNTY_CSV_HEADERS = ['county_fips', 'county_name', 'state', 'issuer_id', 'issuer_name', 'avg_monthly_enrollment']

/** One CSV row per issuer in the county. */
export function countyRows(c: CountyLandscape): (string | number | null)[][] {
  return c.issuers.map((i) => [c.fips, c.countyName, c.state, i.issuerId, i.name, i.enrollment])
}
