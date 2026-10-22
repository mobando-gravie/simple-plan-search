import { dataResponse, parseFormat } from '@/app/lib/api/dataResponse'
import { jsonError } from '@/app/lib/api/respond'
import {
  availabilityRows,
  AVAILABILITY_CSV_HEADERS,
  planAvailability,
  SERVICE_AREA_DATA,
} from '@/app/lib/services/planServiceArea'

/**
 * Where a plan is sold: its CMS service area resolved to counties (Service Area PUF,
 * latest year, FFM states). Keyed by the 14-char HIOS plan id.
 */
export async function GET(request: Request, { params }: { params: Promise<{ hiosPlanId: string }> }) {
  const { hiosPlanId } = await params
  const format = parseFormat(new URL(request.url).searchParams.get('format'))
  if (!format) return jsonError(400, 'format must be "json" or "csv".')

  const a = planAvailability(hiosPlanId)
  if (!a) {
    return jsonError(
      404,
      `No service area for plan ${hiosPlanId}.`,
      `The Service Area PUF (plan year ${SERVICE_AREA_DATA.planYear}, FFM states) has no row for this id — it may be a state-based-exchange plan or a different year.`,
    )
  }

  return dataResponse(
    format,
    { plan: a.planId, state: a.state, serviceAreaId: a.serviceAreaId, planYear: a.planYear, counties: a.counties },
    { headers: AVAILABILITY_CSV_HEADERS, rows: availabilityRows(a), filename: `plan-availability-${a.planId}.csv` },
  )
}
