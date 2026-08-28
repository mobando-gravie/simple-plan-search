import { NextResponse } from 'next/server'
import { errorMessage } from './errors'

/**
 * The shared body of the two typeahead routes: always a `hits` array, and an upstream
 * failure surfaces as 502 with an empty list rather than breaking the client's parse.
 */
export async function hitsResponse<T>(
  fallback: string,
  run: () => Promise<T[]>,
): Promise<NextResponse> {
  try {
    return NextResponse.json({ hits: await run() })
  } catch (e) {
    return NextResponse.json({ hits: [], error: errorMessage(e, fallback) }, { status: 502 })
  }
}
