import { NextResponse } from 'next/server'
import { edgeCache, NO_STORE } from './api/cacheHeaders'
import { planCacheTtlSeconds } from './services/planSearch'

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
    return NextResponse.json({ hits: await run() }, { headers: typeaheadCache() })
  } catch (e) {
    console.error(message, e)
    return NextResponse.json(
      { hits: [], error: message, retryable: true },
      { status: 502, headers: NO_STORE },
    )
  }
}

/** Typeahead and its empty short-circuits cache for the plan TTL; the directory moves slowly. */
export function typeaheadCache(): Record<string, string> {
  const ttl = planCacheTtlSeconds()
  return edgeCache(ttl, ttl)
}
