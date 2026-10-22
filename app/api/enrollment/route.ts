import { dataResponse, parseFormat } from '@/app/lib/api/dataResponse'
import { jsonError } from '@/app/lib/api/respond'
import {
  enrollmentOverview,
  enrollmentRows,
  ENROLLMENT_CSV_HEADERS,
  issuerRows,
  ISSUER_CSV_HEADERS,
  metalMixRows,
  METAL_MIX_CSV_HEADERS,
  stateEnrollment,
  type StateEnrollment,
} from '@/app/lib/services/enrollment'

/** The CSV facet for a state: its top plans (default), metal mix, or top issuers. */
const CSV_VIEWS = {
  plans: { headers: ENROLLMENT_CSV_HEADERS, rows: enrollmentRows, suffix: '' },
  metal: { headers: METAL_MIX_CSV_HEADERS, rows: metalMixRows, suffix: '-metal-mix' },
  issuers: { headers: ISSUER_CSV_HEADERS, rows: issuerRows, suffix: '-issuers' },
} as const
type View = keyof typeof CSV_VIEWS

function parseView(raw: string | null): View | null {
  const v = (raw ?? 'plans').trim().toLowerCase()
  return v in CSV_VIEWS ? (v as View) : null
}

/**
 * Marketplace enrollment (CMS plan-level PUF, FFM + SBE). `?state=XX` (optional
 * `&year=YYYY`) for a state's total, metal mix, top plans and issuers; no selector
 * for an all-state overview. Each offers `?format=csv`, with `&view=metal|issuers`
 * selecting which facet the CSV holds.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const format = parseFormat(params.get('format'))
  if (!format) return jsonError(400, 'format must be "json" or "csv".')
  const view = parseView(params.get('view'))
  if (!view) return jsonError(400, 'view must be "plans", "metal" or "issuers".')

  const state = params.get('state')?.trim()
  if (state) {
    const yearRaw = params.get('year')?.trim()
    let year: number | undefined
    if (yearRaw) {
      year = Number(yearRaw)
      if (!Number.isInteger(year)) return jsonError(400, 'year must be a four-digit year.', `Got "${yearRaw}".`)
    }
    const e: StateEnrollment | null = stateEnrollment(state, year)
    if (!e) return jsonError(404, `No enrollment for ${state}${year ? ` in ${year}` : ''}.`, 'Use a two-letter state code, e.g. TX.')
    const csv = CSV_VIEWS[view]
    return dataResponse(
      format,
      e,
      { headers: csv.headers, rows: csv.rows(e), filename: `enrollment-${e.state}-${e.year}${csv.suffix}.csv` },
    )
  }

  const ov = enrollmentOverview()
  return dataResponse(
    format,
    ov,
    {
      headers: ['state', 'state_name', 'latest_year', 'latest_avg_monthly_enrollment'],
      rows: ov.states.map((s) => [s.state, s.stateName, s.latestYear, s.latestTotal]),
      filename: 'enrollment-overview.csv',
    },
  )
}
