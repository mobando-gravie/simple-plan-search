import { dataResponse, parseFormat, type Format } from '@/app/lib/api/dataResponse'
import { jsonError, upstreamError } from '@/app/lib/api/respond'
import { countyLandscape, countyRows, COUNTY_CSV_HEADERS } from '@/app/lib/services/countyEnrollment'
import { resolveZip } from '@/app/lib/services/planSearch'
import { isZipCode } from '@/app/lib/validation'

const FIPS_PATTERN = /^\d{5}$/

/**
 * County marketplace landscape (CMS QHP detailed PUF, FFM states): issuers and
 * enrollee demographics for a county. Select by `?fips=48201` or `?zip=77001`.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const format = parseFormat(params.get('format'))
  if (!format) return jsonError(400, 'format must be "json" or "csv".')

  const fips = params.get('fips')?.trim()
  if (fips) {
    if (!FIPS_PATTERN.test(fips)) return jsonError(400, 'fips must be five digits.', `Got "${fips}".`)
    return respond(fips, format)
  }

  const zip = params.get('zip')?.trim()
  if (zip) {
    if (!isZipCode(zip)) return jsonError(400, 'zip must be five digits.', `Got "${zip}".`)
    try {
      const county = await resolveZip(zip)
      return respond(county.fipsCode, format)
    } catch (e) {
      return upstreamError(e, 'Zip lookup is temporarily unavailable.')
    }
  }

  return jsonError(400, 'Provide ?fips= or ?zip=.')
}

function respond(fips: string, format: Format) {
  const c = countyLandscape(fips)
  if (!c) {
    return jsonError(
      404,
      `No county enrollment for ${fips}.`,
      'The CMS detailed county PUF covers HealthCare.gov states only; state-based-exchange counties are absent.',
    )
  }
  return dataResponse(
    format,
    { planYear: c.planYear, county: c },
    { headers: COUNTY_CSV_HEADERS, rows: countyRows(c), filename: `county-enrollment-${fips}.csv` },
  )
}
