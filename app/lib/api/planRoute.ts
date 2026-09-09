import { NextResponse } from 'next/server'
import { runPlanQuery, type PlanQueryResult } from '../services/planQuery'
import { parseApiQuery, type ApiQuery } from './query'
import { jsonError, upstreamError } from './respond'

/**
 * The shared body of every plan-bearing route: parse the query, run the search
 * once, hand the result to the route's own shaping. Each route differs only in
 * what it builds from the same three inputs.
 */
export async function planQueryRoute(
  request: Request,
  build: (context: { query: ApiQuery; run: PlanQueryResult }) => unknown,
): Promise<NextResponse> {
  const parsed = parseApiQuery(new URL(request.url).searchParams)
  if ('error' in parsed) return jsonError(400, parsed.error, parsed.hint)

  try {
    const run = await runPlanQuery(parsed.query.criteria, parsed.query.filters, {
      refresh: parsed.query.refresh,
    })
    const built = build({ query: parsed.query, run })
    // A route that has to answer 404 builds its own response instead of a body.
    return built instanceof NextResponse ? built : NextResponse.json(built)
  } catch (e) {
    return upstreamError(e, 'Plan search is temporarily unavailable.')
  }
}
