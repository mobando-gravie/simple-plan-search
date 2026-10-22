/**
 * Authoritative county FIPS → display name, from the U.S. Census national county
 * file. The rating-area crosswalk only lists counties CMS groups into areas, so it
 * misses many (e.g. Harris, TX); the Census file is complete.
 */
const CENSUS_URL = 'https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt'
const UA = 'curl/8.4.0'

/** Drop the governmental-unit suffix for display; keep "city" (VA independent cities). */
function pretty(name: string): string {
  return name
    .replace(/\s+(County|Parish|Borough|Census Area|City and Borough|Municipality|Planning Region|Municipio)$/i, '')
    .trim()
}

export async function fetchCountyNames(): Promise<Map<string, string>> {
  const res = await fetch(CENSUS_URL, { headers: { 'User-Agent': UA, Accept: 'text/plain' } })
  if (!res.ok) throw new Error(`${CENSUS_URL} → ${res.status}`)
  const text = await res.text()
  const map = new Map<string, string>()
  for (const line of text.split('\n').slice(1)) {
    const [, statefp, countyfp, , countyName] = line.split('|')
    if (!statefp || !countyfp || !countyName) continue
    map.set(`${statefp}${countyfp}`, pretty(countyName))
  }
  return map
}
