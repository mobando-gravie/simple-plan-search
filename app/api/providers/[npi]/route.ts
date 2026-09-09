import { NextResponse } from 'next/server'
import { jsonError } from '@/app/lib/api/respond'
import { errorMessage } from '@/app/lib/errors'
import { isNpi } from '@/app/lib/identifiers'
import { resolveProviders } from '@/app/lib/services/entityLookup'

/** By NPI, no zip needed — the search route is the geographic one. */
export async function GET(request: Request, { params }: { params: Promise<{ npi: string }> }) {
  const { npi } = await params
  if (!isNpi(npi)) {
    return jsonError(400, 'npi must be ten digits.', `Got "${npi}".`)
  }
  try {
    const { resolved, unresolved } = await resolveProviders([npi])
    if (unresolved.length > 0 || resolved.length === 0) {
      return jsonError(404, `Ideon has no provider ${npi}.`, 'Search by name: /api/providers?zip=11201&q=smith')
    }
    return NextResponse.json({ provider: resolved[0] })
  } catch (e) {
    return jsonError(502, errorMessage(e, 'Provider lookup failed.'))
  }
}
