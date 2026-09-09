import { NextResponse } from 'next/server'
import { jsonError } from '@/app/lib/api/respond'
import { errorMessage } from '@/app/lib/errors'
import { resolveZip } from '@/app/lib/services/planSearch'
import { isZipCode } from '@/app/lib/validation'

/** Ideon requires a FIPS code on every plan search; this is where it comes from. */
export async function GET(request: Request, { params }: { params: Promise<{ zip: string }> }) {
  const { zip } = await params
  if (!isZipCode(zip)) {
    return jsonError(400, 'zip must be five digits.', `Got "${zip}".`)
  }
  try {
    const county = await resolveZip(zip)
    return NextResponse.json({ zip, ...county })
  } catch (e) {
    // A zip Ideon does not know throws rather than 404ing, so both land here.
    return jsonError(404, errorMessage(e, `No county for zip ${zip}.`))
  }
}
