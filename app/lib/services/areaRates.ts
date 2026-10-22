import rawData from '../ratingAreas/data/area-rates.json'

/**
 * Historical premiums per rating area from the CMS Rate PUF: the cheapest plan, the
 * lowest-cost silver, and the benchmark (second-lowest silver) curves, by reference
 * age, per plan year. Pure over committed data. FFM (HealthCare.gov) states only.
 */

type Curve = Record<string, number>
type YearCurves = { cheapestCents: Curve; lowestSilverCents: Curve; benchmarkSilverCents: Curve }
type RawArea = {
  state: string
  areaNumber: number
  years: Record<string, YearCurves>
}
export type AreaRatesData = {
  planYears: number[]
  referenceAges: number[]
  source: string
  generatedAt: string
  ffmStates: string[]
  areas: Record<string, RawArea>
}

export const RATE_DATA = rawData as AreaRatesData

export type AreaRateYear = { year: number } & YearCurves
export type AreaRates = {
  id: string
  state: string
  areaNumber: number
  referenceAges: number[]
  years: AreaRateYear[]
}

export function isFfmState(state: string): boolean {
  return RATE_DATA.ffmStates.includes(state.trim().toUpperCase())
}

/** Area id (e.g. MN07) → its rate curves across years, newest last; null when absent. */
export function areaRates(id: string): AreaRates | null {
  const a = RATE_DATA.areas[id]
  if (!a) return null
  const years = Object.entries(a.years)
    .map(([y, v]) => ({ year: Number(y), ...v }))
    .sort((x, y) => x.year - y.year)
  return { id, state: a.state, areaNumber: a.areaNumber, referenceAges: RATE_DATA.referenceAges, years }
}

export const AREA_RATE_CSV_HEADERS = ['rating_area_id', 'year', 'age', 'cheapest_cents', 'lowest_silver_cents', 'benchmark_silver_cents']

/** One CSV row per year × reference age. */
export function areaRateRows(r: AreaRates): (string | number | null)[][] {
  const rows: (string | number | null)[][] = []
  for (const y of r.years) {
    for (const age of r.referenceAges) {
      const a = String(age)
      rows.push([r.id, y.year, age, y.cheapestCents[a] ?? null, y.lowestSilverCents[a] ?? null, y.benchmarkSilverCents[a] ?? null])
    }
  }
  return rows
}
