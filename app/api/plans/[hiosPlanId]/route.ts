import { planQueryRoute } from '@/app/lib/api/planRoute'
import {
  cacheBlock,
  describeQuery,
  marketBlock,
  planFull,
  selectionsOf,
} from '@/app/lib/api/present'
import { jsonError } from '@/app/lib/api/respond'

/**
 * A plan only exists inside a search — its premium and coverage answer a household
 * and a zip — so this takes the same parameters as /api/plans.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ hiosPlanId: string }> },
) {
  const { hiosPlanId } = await params

  return planQueryRoute(request, ({ query, run }) => {
    // Looked up in the unfiltered set: a filter shapes the list, not whether the
    // plan exists.
    const plan = run.result.plans.find((p) => p.hiosPlanId === hiosPlanId)
    if (!plan) {
      return jsonError(
        404,
        `No plan ${hiosPlanId} in this search.`,
        'A plan exists only inside a search — check /api/plans for what this zip, household and enrollment date return.',
      )
    }
    return {
      query: describeQuery(run.criteria, query.filters, { view: 'full', limit: query.limit }),
      market: marketBlock(run.result, { matched: 1, returned: 1 }),
      cache: cacheBlock(run.result),
      plan: planFull(plan, selectionsOf(run.criteria)),
    }
  })
}
