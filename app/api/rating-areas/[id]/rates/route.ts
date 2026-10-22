import { dataResponse, parseFormat } from '@/app/lib/api/dataResponse'
import { jsonError } from '@/app/lib/api/respond'
import {
  areaRateRows,
  areaRates,
  AREA_RATE_CSV_HEADERS,
  isFfmState,
  RATE_DATA,
} from '@/app/lib/services/areaRates'
import { normalizeAreaId } from '@/app/lib/services/ratingAreas'

/**
 * Historical premiums for a rating area from the CMS Rate PUF: the cheapest and
 * benchmark-silver curves by reference age, per year. FFM states only.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params
  const format = parseFormat(new URL(request.url).searchParams.get('format'))
  if (!format) return jsonError(400, 'format must be "json" or "csv".')

  const id = normalizeAreaId(raw)
  if (!id) return jsonError(400, 'Rating area must be a state code plus a number, e.g. TX01.', `Got "${raw}".`)

  const r = areaRates(id)
  if (!r) {
    const st = id.slice(0, 2)
    const hint = isFfmState(st)
      ? 'No rate data for this area and year range.'
      : `The federal Rate PUF covers HealthCare.gov states; ${st} runs its own exchange, so plan-level rates are not published here.`
    return jsonError(404, `No rate data for ${id}.`, hint)
  }

  return dataResponse(
    format,
    {
      ratingArea: id,
      state: r.state,
      areaNumber: r.areaNumber,
      source: RATE_DATA.source,
      referenceAges: r.referenceAges,
      years: r.years,
    },
    { headers: AREA_RATE_CSV_HEADERS, rows: areaRateRows(r), filename: `rating-area-rates-${id}.csv` },
  )
}
