import rawData from '../plans/data/plan-service-areas.json'

/**
 * Where a plan is sold: its CMS service area resolved to counties (latest year),
 * from the Service Area PUF. Pure over committed data. FFM states only.
 */

type County = { fips: string; name: string | null }
export type PlanServiceAreaData = {
  planYear: number
  source: string
  generatedAt: string
  serviceAreas: Record<string, { state: string; counties: County[] }>
  plans: Record<string, string>
}

export const SERVICE_AREA_DATA = rawData as PlanServiceAreaData

export type PlanAvailability = {
  planId: string
  serviceAreaId: string
  state: string
  planYear: number
  counties: { fips: string; name: string | null }[]
}

/** Counties a plan is sold in; null when the plan is not in the FFM Service Area PUF. */
export function planAvailability(planId: string): PlanAvailability | null {
  const id = planId.trim()
  const key = SERVICE_AREA_DATA.plans[id]
  if (!key) return null
  const sa = SERVICE_AREA_DATA.serviceAreas[key]
  if (!sa) return null
  return {
    planId: id,
    serviceAreaId: key.split(':')[1] ?? key,
    state: sa.state,
    planYear: SERVICE_AREA_DATA.planYear,
    counties: sa.counties,
  }
}

export const AVAILABILITY_CSV_HEADERS = ['plan_id', 'state', 'service_area_id', 'county_fips', 'county_name']

export function availabilityRows(a: PlanAvailability): (string | number | null)[][] {
  return a.counties.map((c) => [a.planId, a.state, a.serviceAreaId, c.fips, c.name])
}
