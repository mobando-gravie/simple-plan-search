/**
 * Builds app/lib/county/data/county-enrollment.json from the FFM QHP detailed
 * (issuer × county) enrollment PUF — latest year. Per county FIPS: the issuers that
 * cover it with enrollment, plus demographics summed across issuers. FFM states only.
 *
 * Run: CMS_DB=~/public-use-files/db/cms.sqlite npm run build-county-enrollment
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { assertDb, querySqlite } from './lib/cmsDb'
import { fetchCountyNames } from './lib/countyNames'

const OUT = join(process.cwd(), 'app/lib/county/data/county-enrollment.json')

const DEMO = [
  'female', 'male', 'age_0_17', 'age_18_34', 'age_35_54', 'age_55_plus',
  'fpl_under_138', 'fpl_138_250', 'fpl_250_400', 'fpl_over_400', 'fpl_unknown', 'smoker',
] as const

/** CMS writes some FIPS as a float ('2020.0'), dropping the leading zero. */
const cleanFips = (raw: string): string => String(raw).replace(/\.0+$/, '').padStart(5, '0')

type Row = {
  fips: string; st: string; issuerId: string; enr: number
} & Record<(typeof DEMO)[number], number>

async function main() {
  assertDb()
  const countyNames = await fetchCountyNames()
  const year = querySqlite<{ y: number }>(
    'SELECT MAX(business_year) AS y FROM issuer_county_enrollment',
  )[0].y

  const names = new Map<string, string>()
  for (const r of querySqlite<{ id: string; name: string }>(
    `SELECT DISTINCT issuer_id AS id, issuer_name AS name
       FROM plan WHERE business_year = ${year} AND issuer_name IS NOT NULL`,
  )) {
    names.set(r.id, r.name)
  }

  const rows = querySqlite<Row>(`
    SELECT county_fips AS fips, state_code AS st, issuer_id AS issuerId,
           SUM(avg_monthly_enrollment) AS enr,
           ${DEMO.map((d) => `SUM(${d}) AS ${d}`).join(', ')}
    FROM issuer_county_enrollment
    WHERE business_year = ${year} AND avg_monthly_enrollment IS NOT NULL
    GROUP BY county_fips, issuer_id`)

  type County = {
    state: string
    countyName: string | null
    total: number
    issuers: { issuerId: string; name: string; enrollment: number }[]
    demographics: Record<string, number>
  }
  const counties: Record<string, County> = {}
  for (const r of rows) {
    if (!r.enr || r.enr <= 0) continue
    const fips = cleanFips(r.fips)
    const c = (counties[fips] ??= {
      state: r.st,
      countyName: countyNames.get(fips) ?? null,
      total: 0,
      issuers: [],
      demographics: Object.fromEntries(DEMO.map((d) => [d, 0])),
    })
    c.total += r.enr
    c.issuers.push({ issuerId: r.issuerId, name: names.get(r.issuerId) ?? r.issuerId, enrollment: r.enr })
    for (const d of DEMO) c.demographics[d] += r[d] ?? 0
  }
  for (const c of Object.values(counties)) c.issuers.sort((a, b) => b.enrollment - a.enrollment)

  writeFileSync(
    OUT,
    JSON.stringify({
      planYear: year,
      source: 'CMS QHP detailed (issuer × county) enrollment PUF — FFM states',
      generatedAt: new Date().toISOString(),
      counties,
    }),
  )
  const named = Object.values(counties).filter((c) => c.countyName).length
  console.log(`Wrote ${Object.keys(counties).length} counties for ${year} (${named} named).`)
  const harris = counties['48201']
  console.log('48201 sample:', harris?.countyName, harris?.total, harris?.issuers[0])
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
