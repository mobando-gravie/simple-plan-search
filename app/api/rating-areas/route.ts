import { dataResponse, parseFormat, type Format } from '@/app/lib/api/dataResponse'
import { jsonError, upstreamError } from '@/app/lib/api/respond'
import {
  areaCountyRows,
  areaIdForCountyFips,
  areasInState,
  COUNTY_CSV_HEADERS,
  DATA,
  getArea,
  ratingAreaForZip,
  statesOverview,
} from '@/app/lib/services/ratingAreas'
import { isZipCode } from '@/app/lib/validation'

const FIPS_PATTERN = /^\d{5}$/

/**
 * The rating-area collection. One of: `?zip=` or `?county_fips=` (reverse to an area), `?state=`
 * (all areas in a state), or no selector (an overview of every state). Each offers `?format=csv`.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const format = parseFormat(params.get('format'))
  if (!format) return jsonError(400, 'format must be "json" or "csv".')

  const zip = params.get('zip')?.trim()
  if (zip !== undefined && zip !== '') return byZip(zip, format)

  const countyFips = params.get('county_fips')?.trim()
  if (countyFips !== undefined && countyFips !== '') return byCountyFips(countyFips, format)

  const state = params.get('state')?.trim()
  if (state !== undefined && state !== '') return byState(state, format)

  const states = statesOverview(DATA)
  return dataResponse(
    format,
    { planYear: DATA.planYear, source: DATA.source, states },
    {
      headers: ['state', 'state_name', 'basis', 'area_count'],
      rows: states.map((s) => [s.state, s.stateName, s.basis, s.areaCount]),
      filename: 'rating-areas.csv',
    },
  )
}

async function byZip(zip: string, format: Format) {
  if (!isZipCode(zip)) return jsonError(400, 'zip must be five digits.', `Got "${zip}".`)
  let found
  try {
    found = await ratingAreaForZip(zip)
  } catch (e) {
    return upstreamError(e, 'Zip lookup is temporarily unavailable.')
  }
  if (!found) return jsonError(404, `No rating area for zip ${zip}.`)
  return reverseResponse(format, { zip }, found.county.fips, found.county.name, found.area, `rating-area-zip-${zip}.csv`)
}

function byCountyFips(fips: string, format: Format) {
  if (!FIPS_PATTERN.test(fips)) return jsonError(400, 'county_fips must be five digits.', `Got "${fips}".`)
  const id = areaIdForCountyFips(DATA, fips)
  const area = id ? getArea(DATA, id) : null
  if (!area) {
    return jsonError(404, `No rating area for county ${fips}.`, 'A county split by zip resolves only by zip — try ?zip=.')
  }
  const name = area.counties.find((c) => c.fips === fips)?.name ?? ''
  return reverseResponse(format, { countyFips: fips }, fips, name, area, `rating-area-county-${fips}.csv`)
}

function byState(state: string, format: Format) {
  const inState = areasInState(DATA, state)
  if (!inState) return jsonError(404, `No rating areas for state ${state}.`, 'Use a two-letter state code, e.g. MN.')
  return dataResponse(
    format,
    inState,
    {
      headers: COUNTY_CSV_HEADERS,
      rows: inState.areas.flatMap(({ id }) => areaCountyRows(DATA, DATA.areas[id])),
      filename: `rating-areas-${inState.state}.csv`,
    },
  )
}

/** The two reverse lookups share one JSON/CSV shape: the query echoed, plus the county and area. */
function reverseResponse(
  format: Format,
  query: Record<string, string>,
  countyFips: string,
  countyName: string,
  area: { id: string; state: string; areaNumber: number },
  filename: string,
) {
  const stateName = DATA.states[area.state]?.name ?? null
  return dataResponse(
    format,
    {
      ...query,
      state: area.state,
      county: { fips: countyFips, name: countyName },
      ratingArea: { id: area.id, areaNumber: area.areaNumber, stateName },
    },
    {
      headers: COUNTY_CSV_HEADERS,
      rows: [[area.id, area.state, stateName ?? '', area.areaNumber, countyFips, countyName, '']],
      filename,
    },
  )
}
