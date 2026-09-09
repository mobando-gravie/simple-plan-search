import { NextResponse } from 'next/server'
import { jsonError, upstreamError } from '@/app/lib/api/respond'
import { isRxcui } from '@/app/lib/identifiers'
import { resolveDrugs } from '@/app/lib/services/entityLookup'

/** RxCUI is the only drug identifier the source will look up; a med_id cannot be resolved. */
export async function GET(request: Request, { params }: { params: Promise<{ rxcui: string }> }) {
  const { rxcui } = await params
  if (!isRxcui(rxcui)) {
    return jsonError(400, 'rxcui must be 1–9 digits.', `Got "${rxcui}".`)
  }
  try {
    const { resolved, unresolved } = await resolveDrugs([rxcui])
    if (unresolved.length > 0 || resolved.length === 0) {
      return jsonError(
        404,
        `No formulary drug for RxCUI ${rxcui}.`,
        'Search by name: /api/drugs?q=lipitor',
      )
    }
    const drug = resolved[0]
    return NextResponse.json({
      drug: {
        ...drug,
        // The pair /api/plans and /api/coverage want as the `drugs` parameter.
        selector: `${drug.medId}_${drug.ndc}`,
      },
    })
  } catch (e) {
    return upstreamError(e, 'Drug lookup is temporarily unavailable.')
  }
}
