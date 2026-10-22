/**
 * Regenerates app/lib/ratingAreas/data/rating-areas.json from public sources:
 *   - county ↔ rating area: CMS geographic rating area pages (one per state)
 *   - county name → FIPS:    the U.S. Census national county file
 *
 * Run: npm run build-rating-areas [year]
 * Static reference data — re-run yearly, inspect the unmatched-county log, commit the JSON.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PLAN_YEAR = Number(process.argv[2]) || 2026
const CENSUS_URL = 'https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt'
const CMS_BASE = 'https://www.cms.gov/cciio/programs-and-initiatives/health-insurance-market-reforms'
const OUT = join(process.cwd(), 'app/lib/ratingAreas/data/rating-areas.json')
const UA = 'curl/8.4.0' // CMS's Cloudflare 1010-bans unknown agents.

// The 50 states + DC. Territories run a negligible individual market and their CMS pages and
// Census coding differ enough to handle separately; left out rather than shipped half-parsed.
const STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

/** CMS misspellings on the GRA pages, keyed by `${state}:${normCounty(cmsName)}` → correct norm. */
const CMS_TYPOS: Record<string, string> = {
  'CA:san bernadino': 'san bernardino',
  'GA:heralson': 'haralson',
  'IL:vermillion': 'vermilion',
  'IN:kosclusko': 'kosciusko',
  'IN:deleware': 'delaware',
  'IN:davless': 'daviess',
  'IN:dubols': 'dubois',
  'KS:chautaugua': 'chautauqua',
  'LA:vermillion': 'vermilion', // "Vermillion Parish"
  'ND:trail': 'traill',
  'NY:deleware': 'delaware',
  'OH:galia': 'gallia',
}

/**
 * Strip the governmental-unit suffix, accents and punctuation so CMS "St. Louis" meets Census
 * "St. Louis County". Keeps a trailing "city": a Virginia independent city ("Richmond city") is a
 * distinct FIPS from the like-named county, so folding them would silently cross-wire the two.
 */
function normCounty(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Doña Ana → dona ana
    .toLowerCase()
    .replace(/\s+(county|parish|borough|census area|city and borough|municipality|planning region|municipio)$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** CMS and Census disagree on internal spaces (La Salle ↔ LaSalle, De Baca ↔ DeBaca). */
const despace = (n: string): string => n.replace(/ /g, '')

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,text/plain' } })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.text()
}

/** (stateAbbr, normName) → 5-digit FIPS, from the pipe-delimited Census county file. */
async function censusFips(): Promise<Map<string, string>> {
  const text = await get(CENSUS_URL)
  const map = new Map<string, string>()
  for (const line of text.split('\n').slice(1)) {
    const [state, statefp, countyfp, , countyName] = line.split('|')
    if (!state || !statefp || !countyfp || !countyName) continue
    const code = `${statefp}${countyfp}`
    const norm = normCounty(countyName)
    map.set(`${state}:${norm}`, code)
    map.set(`${state}:${despace(norm)}`, code) // despaced fallback
  }
  return map
}

type Row = { areaNum: number; county: string; zip3: string }

/**
 * The CMS table is three columns: Rating Area ID | County Name | 3-digit zip (if applicable).
 * Some states publish two tables — individual market first, small group second (with different
 * area definitions). This app is individual-market, so only the first table is read.
 */
function parseCmsRows(html: string): Row[] {
  const firstTable = html.match(/<table[\s\S]*?<\/table>/i)?.[0] ?? ''
  const cells = [...firstTable.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim(),
  )
  const rows: Row[] = []
  for (let i = 0; i + 2 < cells.length; i += 3) {
    const area = cells[i].match(/Rating Area\s+(\d+)/i)
    if (!area) continue // header row and stray cells
    rows.push({ areaNum: Number(area[1]), county: cells[i + 1], zip3: cells[i + 2] })
  }
  return rows
}

type Area = {
  id: string
  state: string
  areaNumber: number
  basis: 'county' | 'zip3'
  counties: { fips: string; name: string }[]
  zip3: string[]
}

async function main() {
  const fips = await censusFips()
  const states: Record<string, { name: string; basis: string; areaIds: string[] }> = {}
  const areas: Record<string, Area> = {}
  const countyToArea: Record<string, string> = {}
  const zip3ToArea: Record<string, string> = {}
  const unmatched: string[] = []

  for (const [st, name] of Object.entries(STATES)) {
    const html = await get(`${CMS_BASE}/${st.toLowerCase()}-gra`)
    const rows = parseCmsRows(html)
    if (rows.length === 0) {
      unmatched.push(`${st}: no rating-area rows parsed`)
      continue
    }
    for (const { areaNum, county, zip3 } of rows) {
      const id = `${st}${String(areaNum).padStart(2, '0')}`
      const area = (areas[id] ??= {
        id, state: st, areaNumber: areaNum, basis: 'county', counties: [], zip3: [],
      })
      if (county) {
        const n = normCounty(county)
        const key = CMS_TYPOS[`${st}:${n}`] ?? n
        const code = fips.get(`${st}:${key}`) ?? fips.get(`${st}:${despace(key)}`)
        if (!code) {
          unmatched.push(`${st} ${id}: "${county}" → no Census FIPS`)
          continue
        }
        area.counties.push({ fips: code, name: county })
        countyToArea[code] = id
      } else if (zip3) {
        area.basis = 'zip3'
        const prefix = zip3.padStart(3, '0').slice(0, 3)
        if (!area.zip3.includes(prefix)) area.zip3.push(prefix)
        zip3ToArea[`${st}:${prefix}`] = id
      }
    }
    const ids = Object.keys(areas).filter((id) => areas[id].state === st).sort()
    const hasCounty = ids.some((id) => areas[id].counties.length > 0)
    const hasZip3 = ids.some((id) => areas[id].zip3.length > 0)
    // Tri-state: California is county-based except Los Angeles, which splits by 3-digit zip.
    const basis = hasCounty && hasZip3 ? 'mixed' : hasZip3 ? 'zip3' : 'county'
    states[st] = { name, basis, areaIds: ids }
    process.stderr.write(`${st}: ${ids.length} areas\n`)
  }

  const out = {
    planYear: PLAN_YEAR,
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'CMS geographic rating areas; county FIPS from the U.S. Census Bureau',
    states,
    areas,
    countyToArea,
    zip3ToArea,
  }
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')

  process.stderr.write(
    `\nWrote ${Object.keys(areas).length} areas across ${Object.keys(states).length} states → ${OUT}\n`,
  )
  if (unmatched.length > 0) {
    process.stderr.write(`\n${unmatched.length} unmatched (fix normCounty or handle by hand):\n`)
    for (const u of unmatched) process.stderr.write(`  ${u}\n`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
