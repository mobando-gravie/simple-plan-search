/**
 * Builds app/lib/plans/data/plan-service-areas.json from the Service Area PUF —
 * latest year. Maps each plan to the counties it is sold in, via its service area.
 * Two maps keep it compact: plan → "state:service_area_id", and that key → FIPS list.
 * FFM states only.
 *
 * Run: CMS_DB=~/public-use-files/db/cms.sqlite npm run build-service-areas
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { assertDb, querySqlite } from './lib/cmsDb'
import { fetchCountyNames } from './lib/countyNames'

const OUT = join(process.cwd(), 'app/lib/plans/data/plan-service-areas.json')

const cleanFips = (raw: string): string => String(raw).replace(/\.0+$/, '').padStart(5, '0')

async function main() {
  assertDb()
  const countyNames = await fetchCountyNames()
  const year = querySqlite<{ y: number }>('SELECT MAX(business_year) AS y FROM service_area')[0].y

  type County = { fips: string; name: string | null }
  const serviceAreas: Record<string, { state: string; counties: County[] }> = {}
  const seen: Record<string, Set<string>> = {}
  for (const r of querySqlite<{ st: string; sa: string; fips: string }>(
    `SELECT state_code AS st, service_area_id AS sa, county_fips AS fips
       FROM service_area WHERE business_year = ${year}
         AND service_area_id IS NOT NULL AND county_fips IS NOT NULL`,
  )) {
    const key = `${r.st}:${r.sa}`
    const set = (seen[key] ??= new Set())
    set.add(cleanFips(r.fips))
    serviceAreas[key] ??= { state: r.st, counties: [] }
  }
  for (const [key, set] of Object.entries(seen)) {
    serviceAreas[key].counties = [...set].sort().map((fips) => ({ fips, name: countyNames.get(fips) ?? null }))
  }

  const plans: Record<string, string> = {}
  for (const r of querySqlite<{ pid: string; st: string; sa: string }>(
    `SELECT plan_id AS pid, state_code AS st, service_area_id AS sa
       FROM plan_base WHERE business_year = ${year} AND service_area_id IS NOT NULL`,
  )) {
    const key = `${r.st}:${r.sa}`
    if (serviceAreas[key]) plans[r.pid] = key
  }

  writeFileSync(
    OUT,
    JSON.stringify({
      planYear: year,
      source: 'CMS Service Area PUF — FFM states',
      generatedAt: new Date().toISOString(),
      serviceAreas,
      plans,
    }),
  )
  console.log(
    `Wrote ${Object.keys(plans).length} plans across ${Object.keys(serviceAreas).length} service areas for ${year}.`,
  )
  const [pid, key] = Object.entries(plans).find(([p]) => p.includes('TX')) ?? []
  const sa = serviceAreas[key ?? '']
  console.log('sample plan:', pid, '->', key, sa?.counties.length, 'counties, first:', sa?.counties[0])
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
