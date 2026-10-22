import { dataResponse, parseFormat } from '@/app/lib/api/dataResponse'
import { jsonError } from '@/app/lib/api/respond'
import {
  enrollmentOverview,
  enrollmentRows,
  ENROLLMENT_CSV_HEADERS,
  stateEnrollment,
} from '@/app/lib/services/enrollment'

/**
 * Marketplace enrollment (CMS plan-level PUF, FFM + SBE). `?state=XX` (optional
 * `&year=YYYY`) for a state's total, metal mix, top plans and issuers; no selector
 * for an all-state overview. Each offers `?format=csv`.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const format = parseFormat(params.get('format'))
  if (!format) return jsonError(400, 'format must be "json" or "csv".')

  const state = params.get('state')?.trim()
  if (state) {
    const yearRaw = params.get('year')?.trim()
    let year: number | undefined
    if (yearRaw) {
      year = Number(yearRaw)
      if (!Number.isInteger(year)) return jsonError(400, 'year must be a four-digit year.', `Got "${yearRaw}".`)
    }
    const e = stateEnrollment(state, year)
    if (!e) return jsonError(404, `No enrollment for ${state}${year ? ` in ${year}` : ''}.`, 'Use a two-letter state code, e.g. TX.')
    return dataResponse(
      format,
      e,
      { headers: ENROLLMENT_CSV_HEADERS, rows: enrollmentRows(e), filename: `enrollment-${e.state}-${e.year}.csv` },
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
