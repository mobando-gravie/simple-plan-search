import rawData from '../enrollment/data/state-enrollment.json'

/**
 * Plan-level marketplace enrollment per state and year from the CMS PUF (FFM + SBE):
 * total, metal mix, top plans and top issuers by average monthly enrollment. Pure
 * over committed data. Only the avg_monthly metric (2018+) is carried.
 */

export type EnrollPlan = { planId: string; name: string; issuer: string; metal: string; enrollment: number }
export type EnrollIssuer = { issuerId: string; name: string; enrollment: number }
export type StateYear = {
  total: number
  metalMix: Record<string, number>
  topPlans: EnrollPlan[]
  topIssuers: EnrollIssuer[]
}
type RawState = { stateName: string; years: Record<string, StateYear> }
export type EnrollmentData = {
  planYears: number[]
  measure: string
  source: string
  generatedAt: string
  states: Record<string, RawState>
}

export const ENROLLMENT_DATA = rawData as EnrollmentData

export type StateEnrollment = { state: string; stateName: string; year: number } & StateYear

/** State enrollment for a year (default: latest available for that state); null when absent. */
export function stateEnrollment(state: string, year?: number): StateEnrollment | null {
  const st = state.trim().toUpperCase()
  const s = ENROLLMENT_DATA.states[st]
  if (!s) return null
  const avail = Object.keys(s.years).map(Number).sort((a, b) => a - b)
  const yr = year ?? avail.at(-1)
  const data = yr != null ? s.years[String(yr)] : undefined
  if (!data || yr == null) return null
  return { state: st, stateName: s.stateName, year: yr, ...data }
}

export function enrollmentOverview() {
  const states = Object.entries(ENROLLMENT_DATA.states)
    .map(([state, s]) => {
      const latest = Object.keys(s.years).map(Number).sort((a, b) => b - a)[0]
      return { state, stateName: s.stateName, latestYear: latest, latestTotal: s.years[String(latest)]?.total ?? 0 }
    })
    .sort((a, b) => b.latestTotal - a.latestTotal)
  return { planYears: ENROLLMENT_DATA.planYears, measure: ENROLLMENT_DATA.measure, source: ENROLLMENT_DATA.source, states }
}

export const ENROLLMENT_CSV_HEADERS = ['state', 'year', 'rank', 'plan_id', 'plan_name', 'issuer', 'metal', 'avg_monthly_enrollment']

/** One CSV row per top plan. */
export function enrollmentRows(e: StateEnrollment): (string | number)[][] {
  return e.topPlans.map((p, i) => [e.state, e.year, i + 1, p.planId, p.name, p.issuer, p.metal, p.enrollment])
}
