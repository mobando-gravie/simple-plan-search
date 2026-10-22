/**
 * Builds app/lib/ratingAreas/data/area-rates.json from the CMS Rate PUF.
 * Per rating area × year: the cheapest plan's premium curve and the benchmark
 * (second-lowest-cost silver) curve, by reference age, non-tobacco. The Rate PUF
 * covers HealthCare.gov (FFM) states only; state-based exchanges are absent.
 *
 * Run: CMS_DB=~/public-use-files/db/cms.sqlite npm run build-area-rates
 * Reference data — re-run yearly, inspect the coverage log, commit the JSON.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { assertDb, querySqlite } from './lib/cmsDb'

const AGES = [21, 30, 40, 50, 60, 64]
// The oldest reference age is the top bucket: single '64' in early years, '64 and over'
// from 2018. Both map to the display key '64'; no year carries both, so they never clash.
const AGE_LABELS = ["'21'", "'30'", "'40'", "'50'", "'60'", "'64'", "'64 and over'"]
const AGE_LIST = AGE_LABELS.join(',')
const OUT = join(process.cwd(), 'app/lib/ratingAreas/data/area-rates.json')

const ageKey = (age: string): string => (age === '64 and over' ? '64' : age)

type Row = { yr: number; st: string; ra: string; age: string; cents: number }

/** "Rating Area 7" + "MN" → "MN07"; non-numeric or unparseable → null (skipped). */
function areaId(state: string, ratingArea: string): string | null {
  const m = ratingArea.match(/(\d+)/)
  if (!m) return null
  return `${state}${m[1].padStart(2, '0')}`
}

// Cheapest = lowest individual (non-tobacco) medical rate across plans in the cell.
// Join plan_base to drop dental-only plans (metal 'Low'/'High', $0 rates). Tobacco
// surcharges only raise the rate, so min over individual_rate_cents is the floor.
const CHEAPEST_SQL = `
  SELECT r.business_year AS yr, r.state_code AS st, r.rating_area_id AS ra, r.age,
         MIN(r.individual_rate_cents) AS cents
  FROM rate r
  JOIN plan_base p ON p.business_year = r.business_year AND p.plan_id = r.plan_id
  WHERE r.age IN (${AGE_LIST})
    AND p.dental_only = 'No'
    AND r.individual_rate_cents IS NOT NULL AND r.individual_rate_cents > 0
  GROUP BY r.business_year, r.state_code, r.rating_area_id, r.age`

// Benchmark = second-lowest silver plan at each age (the ACA SLCSP shape).
const BENCHMARK_SQL = `
  WITH sil AS (
    SELECT r.business_year AS yr, r.state_code AS st, r.rating_area_id AS ra, r.age,
           r.plan_id, MIN(r.individual_rate_cents) AS cents
    FROM rate r
    JOIN plan_base p ON p.business_year = r.business_year AND p.plan_id = r.plan_id
    WHERE p.metal_level = 'Silver'
      AND r.age IN (${AGE_LIST})
      AND r.individual_rate_cents IS NOT NULL AND r.individual_rate_cents > 0
    GROUP BY r.business_year, r.state_code, r.rating_area_id, r.age, r.plan_id
  ), ranked AS (
    SELECT yr, st, ra, age, cents,
           ROW_NUMBER() OVER (PARTITION BY yr, st, ra, age ORDER BY cents) AS rn
    FROM sil
  )
  SELECT yr, st, ra, age, cents FROM ranked WHERE rn = 2`

type Curve = Record<string, number>
type AreaYear = { cheapestCents: Curve; benchmarkSilverCents: Curve }
type AreaEntry = { state: string; areaNumber: number; years: Record<string, AreaYear> }

function ensure(
  areas: Record<string, AreaEntry>,
  id: string,
  state: string,
  ra: string,
  yr: number,
): AreaYear {
  const areaNumber = Number(ra.match(/(\d+)/)?.[1] ?? 0)
  const a = (areas[id] ??= { state, areaNumber, years: {} })
  return (a.years[String(yr)] ??= { cheapestCents: {}, benchmarkSilverCents: {} })
}

function main() {
  assertDb()
  const areas: Record<string, AreaEntry> = {}
  const years = new Set<number>()
  const states = new Set<string>()

  console.log('Scanning rate PUF for cheapest curves…')
  for (const r of querySqlite<Row>(CHEAPEST_SQL)) {
    const id = areaId(r.st, r.ra)
    if (!id) continue
    ensure(areas, id, r.st, r.ra, r.yr).cheapestCents[ageKey(r.age)] = r.cents
    years.add(r.yr)
    states.add(r.st)
  }

  console.log('Scanning rate PUF for benchmark silver curves…')
  for (const r of querySqlite<Row>(BENCHMARK_SQL)) {
    const id = areaId(r.st, r.ra)
    if (!id) continue
    ensure(areas, id, r.st, r.ra, r.yr).benchmarkSilverCents[ageKey(r.age)] = r.cents
  }

  const planYears = [...years].sort((a, b) => a - b)
  const data = {
    planYears,
    referenceAges: AGES,
    source: 'CMS Rate PUF (HealthCare.gov / FFM states)',
    generatedAt: new Date().toISOString(),
    ffmStates: [...states].sort(),
    areas,
  }
  writeFileSync(OUT, JSON.stringify(data))

  const sample = areas['TX01']?.years[String(planYears.at(-1))]
  console.log(
    `Wrote ${Object.keys(areas).length} areas across ${states.size} FFM states, ` +
      `years ${planYears[0]}-${planYears.at(-1)}.`,
  )
  console.log('TX01 latest year sample:', JSON.stringify(sample))
}

main()
