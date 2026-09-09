import { NextResponse } from 'next/server'
import { jsonError } from '@/app/lib/api/respond'
import { resolveZip } from '@/app/lib/services/planSearch'
import { isZipCode } from '@/app/lib/validation'

/** Every plan search needs a FIPS code; this is where it comes from. */
export async function GET(request: Request, { params }: { params: Promise<{ zip: string }> }) {
  const { zip } = await params
  if (!isZipCode(zip)) {
    return jsonError(400, 'zip must be five digits.', `Got "${zip}".`)
  }
  try {
    const county = await resolveZip(zip)
    return NextResponse.json({ zip, ...county })
  } catch (e) {
    // An unknown zip throws upstream rather than 404ing, so both land here.
    console.error(`zip lookup failed for ${zip}`, e)
    return jsonError(404, `No county for zip ${zip}.`)
  }
}
