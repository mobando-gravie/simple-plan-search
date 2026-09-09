import { NextResponse } from 'next/server'

/**
 * The shared body of the two typeahead routes: always a `hits` array, and an upstream
 * failure surfaces as 502 with an empty list rather than breaking the client's parse.
 * The upstream detail is logged, not returned.
 */
export async function hitsResponse<T>(
  message: string,
  run: () => Promise<T[]>,
): Promise<NextResponse> {
  try {
    return NextResponse.json({ hits: await run() })
  } catch (e) {
    console.error(message, e)
    return NextResponse.json({ hits: [], error: message, retryable: true }, { status: 502 })
  }
}
