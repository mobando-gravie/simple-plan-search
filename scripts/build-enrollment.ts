/**
 * Builds app/lib/enrollment/data/state-enrollment.json from the plan-level
 * enrollment PUF (FFM + SBE). Per state × year: total, metal mix, top plans and
 * top issuers by average monthly enrollment.
 *
 * Only the avg_monthly metric is used (2018+); the pre-2018 ever_enrolled rows and
 * suppressed (NULL) cells are dropped so the series stays comparable.
 *
 * Run: CMS_DB=~/public-use-files/db/cms.sqlite npm run build-enrollment
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ratingAreas from '../app/lib/ratingAreas/data/rating-areas.json'
import { assertDb, querySqlite } from './lib/cmsDb'

const OUT = join(process.cwd(), 'app/lib/enrollment/data/state-enrollment.json')
const TOP_PLANS = 25
const TOP_ISSUERS = 15
const STATE_NAME = (ratingAreas as { states: Record<string, { name: string }> }).states

// One pass: enrollment summed per plan, carrying name/issuer/metal from plan_base.
// issuer_name is absent before 2021, so it may be null — the shaper falls back to id.
const SQL = `
  SELECT e.business_year AS yr, e.state_code AS st, e.base_plan_id AS pid,
         MAX(p.plan_marketing_name) AS name, MAX(p.issuer_name) AS issuer,
         MAX(p.issuer_id) AS issuerId, MAX(p.metal_level) AS metal,
         SUM(e.avg_monthly_enrollment) AS enr
  FROM plan_enrollment e
  JOIN plan_base p ON p.business_year = e.business_year AND p.plan_id = e.base_plan_id
  WHERE e.measure = 'avg_monthly' AND e.avg_monthly_enrollment IS NOT NULL
  GROUP BY e.business_year, e.state_code, e.base_plan_id`

type Row = {
  yr: number; st: string; pid: string
  name: string | null; issuer: string | null; issuerId: string | null
  metal: string | null; enr: number
}
type Plan = { planId: string; name: string; issuer: string; metal: string; enrollment: number }
type YearData = {
  total: number
  metalMix: Record<string, number>
  topPlans: Plan[]
  topIssuers: { issuerId: string; name: string; enrollment: number }[]
}

/**
 * Issuer id → company name from the URRT (all 51 jurisdictions). The plan PUF leaves issuer_name
 * null for state-based exchanges, so this fills those in; the most-filed spelling per id wins.
 */
function urrtIssuerNames(): Map<string, string> {
  const best = new Map<string, { name: string; n: number }>()
  for (const r of querySqlite<{ id: string; name: string; n: number }>(`
    SELECT issuer_id AS id, TRIM(company) AS name, COUNT(*) AS n
    FROM urrt_plan
    WHERE issuer_id IS NOT NULL AND TRIM(COALESCE(company, '')) <> ''
    GROUP BY issuer_id, TRIM(company)`)) {
    const cur = best.get(r.id)
    if (!cur || r.n > cur.n) best.set(r.id, { name: r.name, n: r.n })
  }
  return new Map([...best].map(([id, v]) => [id, v.name]))
}

function main() {
  assertDb()
  const issuerNames = urrtIssuerNames()
  const nameOf = (issuer: string | null, id: string | null): string =>
    issuer ?? (id ? issuerNames.get(id) : undefined) ?? id ?? 'unknown'
  // state -> year -> accumulators
  const byState: Record<string, Record<string, Row[]>> = {}
  const years = new Set<number>()

  for (const r of querySqlite<Row>(SQL)) {
    if (!r.enr || r.enr <= 0) continue
    years.add(r.yr)
    ;((byState[r.st] ??= {})[String(r.yr)] ??= []).push(r)
  }

  const states: Record<string, { stateName: string; years: Record<string, YearData> }> = {}
  for (const [st, perYear] of Object.entries(byState)) {
    const yearData: Record<string, YearData> = {}
    for (const [yr, rows] of Object.entries(perYear)) {
      const metalMix: Record<string, number> = {}
      const issuerTotals = new Map<string, { name: string; enrollment: number }>()
      let total = 0
      for (const r of rows) {
        total += r.enr
        const metal = r.metal ?? 'Unknown'
        metalMix[metal] = (metalMix[metal] ?? 0) + r.enr
        const id = r.issuerId ?? 'unknown'
        const acc = issuerTotals.get(id) ?? { name: nameOf(r.issuer, r.issuerId), enrollment: 0 }
        acc.enrollment += r.enr
        issuerTotals.set(id, acc)
      }
      const topPlans: Plan[] = rows
        .map((r) => ({
          planId: r.pid,
          name: r.name ?? r.pid,
          issuer: nameOf(r.issuer, r.issuerId),
          metal: r.metal ?? 'Unknown',
          enrollment: r.enr,
        }))
        .sort((a, b) => b.enrollment - a.enrollment)
        .slice(0, TOP_PLANS)
      const topIssuers = [...issuerTotals.entries()]
        .map(([issuerId, v]) => ({ issuerId, name: v.name, enrollment: v.enrollment }))
        .sort((a, b) => b.enrollment - a.enrollment)
        .slice(0, TOP_ISSUERS)
      yearData[yr] = { total, metalMix, topPlans, topIssuers }
    }
    states[st] = { stateName: STATE_NAME[st]?.name ?? st, years: yearData }
  }

  const planYears = [...years].sort((a, b) => a - b)
  writeFileSync(
    OUT,
    JSON.stringify({
      planYears,
      measure: 'avg_monthly_enrollment',
      source: 'CMS plan-level enrollment PUF (FFM + SBE)',
      generatedAt: new Date().toISOString(),
      states,
    }),
  )

  console.log(
    `Wrote ${Object.keys(states).length} states, years ${planYears[0]}-${planYears.at(-1)}.`,
  )
  const tx = states['TX']?.years[String(planYears.at(-1))]
  console.log('TX latest:', tx && { total: tx.total, metalMix: tx.metalMix, top: tx.topPlans[0] })
}

main()
