import { createHash } from 'node:crypto'
import { query, queryOne } from '../db'
import type { IdeonPlanSearchResponse } from '../ideon/types'

export type CachedSearch = {
  cacheKey: string
  response: IdeonPlanSearchResponse
  fetchedAt: Date
  planCount: number
}

/**
 * Recursively sorts keys so {a,b} and {b,a} hash alike.
 *
 * Not `JSON.stringify(x, Object.keys(x).sort())`: an array second argument is a
 * property *allowlist* applied at every depth, so nested keys absent from the top
 * level are dropped. That silently reduced `applicants: [{age, smoker, child}]` to
 * `[{}]` — two households of the same size shared a cache row whatever their ages.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(source)
        .sort()
        .map((key) => [key, canonicalize(source[key])]),
    )
  }
  return value
}

export function cacheKeyFor(request: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(request))).digest('hex')
}

export async function findCached(cacheKey: string): Promise<CachedSearch | null> {
  const row = await queryOne<{
    cache_key: string
    response: IdeonPlanSearchResponse
    fetched_at: string
    plan_count: number
  }>(
    `SELECT cache_key, response, fetched_at, plan_count
       FROM sps_plan_search_cache WHERE cache_key = $1`,
    [cacheKey],
  )
  if (!row) return null
  return {
    cacheKey: row.cache_key,
    response: row.response,
    fetchedAt: new Date(row.fetched_at),
    planCount: row.plan_count,
  }
}

export async function upsertCached(entry: {
  cacheKey: string
  request: Record<string, unknown>
  response: IdeonPlanSearchResponse
  zipCode: string
  fipsCode: string
  planCount: number
}): Promise<void> {
  await query(
    `INSERT INTO sps_plan_search_cache
       (cache_key, request, response, zip_code, fips_code, plan_count, fetched_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (cache_key) DO UPDATE SET
       request    = EXCLUDED.request,
       response   = EXCLUDED.response,
       plan_count = EXCLUDED.plan_count,
       fetched_at = now()`,
    [
      entry.cacheKey,
      JSON.stringify(entry.request),
      JSON.stringify(entry.response),
      entry.zipCode,
      entry.fipsCode,
      entry.planCount,
    ],
  )
}
