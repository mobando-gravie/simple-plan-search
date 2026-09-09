import { planQueryRoute } from '@/app/lib/api/planRoute'
import {
  cacheBlock,
  describeQuery,
  marketBlock,
  planFull,
  planSummary,
  selectionsOf,
} from '@/app/lib/api/present'

export async function GET(request: Request) {
  return planQueryRoute(request, ({ query, run }) => {
    const selections = selectionsOf(run.criteria)
    const shape = query.view === 'full' ? planFull : planSummary
    // Trimmed after filtering and sorting, so `limit` means "the top N of this
    // ordering" rather than "the first N Ideon happened to return".
    const shown = run.plans.slice(0, query.limit)
    return {
      query: describeQuery(run.criteria, query.filters, query),
      market: marketBlock(run.result, { matched: run.plans.length, returned: shown.length }),
      cache: cacheBlock(run.result),
      plans: shown.map((plan) => shape(plan, selections)),
    }
  })
}
