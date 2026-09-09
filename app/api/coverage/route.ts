import { planQueryRoute } from '@/app/lib/api/planRoute'
import { cacheBlock, coverageRow, describeQuery, marketBlock, selectionsOf } from '@/app/lib/api/present'
import { jsonError } from '@/app/lib/api/respond'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const asked = ['providers', 'p', 'drugs', 'x'].some((key) => (params.get(key) ?? '') !== '')
  if (!asked) {
    return jsonError(
      400,
      'Supply providers and/or drugs — there is nothing to report coverage on.',
      'Try ?zip=11201&age=35&providers=1164996864&drugs=158585_42385-0943-01 — see /AGENTS_GUIDE.md.',
    )
  }

  return planQueryRoute(request, ({ query, run }) => {
    const selections = selectionsOf(run.criteria)
    const shown = run.plans.slice(0, query.limit)
    return {
      query: describeQuery(run.criteria, query.filters, query),
      market: marketBlock(run.result, { matched: run.plans.length, returned: shown.length }),
      cache: cacheBlock(run.result),
      requested: {
        providers: run.criteria.providers.map((p) => ({ npi: p.npi, name: p.name })),
        drugs: run.criteria.drugs.map((d) => ({ medId: d.medId, ndc: d.ndc, name: d.name })),
      },
      plans: shown.map((plan) => coverageRow(plan, selections)),
    }
  })
}
