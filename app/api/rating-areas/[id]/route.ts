import { dataResponse, parseFormat } from '@/app/lib/api/dataResponse'
import { jsonError } from '@/app/lib/api/respond'
import {
  areaCountyRows,
  COUNTY_CSV_HEADERS,
  DATA,
  getArea,
  normalizeAreaId,
} from '@/app/lib/services/ratingAreas'

/** One rating area in full: its counties (or 3-digit zips). `?format=csv` downloads the counties. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const format = parseFormat(new URL(request.url).searchParams.get('format'))
  if (!format) return jsonError(400, 'format must be "json" or "csv".')

  const { id: raw } = await params
  const id = normalizeAreaId(raw)
  const area = id ? getArea(DATA, id) : null
  if (!area) {
    return jsonError(404, `No rating area ${raw}.`, 'Try /api/rating-areas?state=MN for a state’s areas.')
  }

  const stateName = DATA.states[area.state]?.name ?? null
  return dataResponse(
    format,
    {
      ratingArea: {
        id: area.id,
        state: area.state,
        stateName,
        areaNumber: area.areaNumber,
        basis: area.basis,
        countyCount: area.counties.length,
        counties: area.counties,
        zip3: area.zip3,
      },
    },
    { headers: COUNTY_CSV_HEADERS, rows: areaCountyRows(DATA, area), filename: `rating-area-${area.id}.csv` },
  )
}
