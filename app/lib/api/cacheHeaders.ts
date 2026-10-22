/**
 * HTTP cache directives. `CDN-Cache-Control` drives the Vercel edge only; the client gets
 * `private, no-cache` so no third-party proxy stores an authed response. Bodies echo only the
 * caller's own query, so the edge reuses one copy across callers safely.
 */

/** Near-immutable surfaces: zip→county, NDC, provider name, the static index and guide. */
export const DETAIL_TTL_SECONDS = 604_800 // 7 days

/** Served stale for `swr` seconds past freshness while one request refreshes in the background. */
export function edgeCache(sMaxAgeSeconds: number, swrSeconds: number): Record<string, string> {
  const sMaxAge = Math.max(0, Math.floor(sMaxAgeSeconds))
  return {
    'CDN-Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${Math.floor(swrSeconds)}`,
    'Cache-Control': 'private, no-cache',
  }
}

/** Refresh and every non-200: never cache, so a transient failure can't freeze at the edge. */
export const NO_STORE: Record<string, string> = {
  'Cache-Control': 'no-store',
  'CDN-Cache-Control': 'no-store',
}
