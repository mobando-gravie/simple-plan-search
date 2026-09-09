import { planQueryRoute } from '@/app/lib/api/planRoute'
import { cacheBlock, describeQuery, marketBlock } from '@/app/lib/api/present'
import { marketSummary } from '@/app/lib/marketSummary'

export async function GET(request: Request) {
  return planQueryRoute(request, ({ query, run }) => ({
    query: describeQuery(run.criteria, query.filters, query),
    // The summary covers every matched plan; `limit` trims plan lists, not aggregates.
    market: marketBlock(run.result, { matched: run.plans.length, returned: run.plans.length }),
    cache: cacheBlock(run.result),
    summary: marketSummary(run.plans, run.criteria),
  }))
}
