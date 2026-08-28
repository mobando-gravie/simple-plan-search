import SearchForm from './SearchForm'
import { errorMessage } from './lib/errors'
import { labelSelections } from './lib/services/entityLookup'
import { searchPlans, type SearchResult } from './lib/services/planSearch'
import { decodeUrlState, type SearchParamsInput } from './lib/urlState'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>
}) {
  // eslint-disable-next-line prefer-const -- `criteria` is reassigned once, below
  let { criteria, filters, openPlanId } = decodeUrlState(await searchParams)

  let result: SearchResult | null = null
  let error: string | null = null
  if (criteria) {
    // Provider and drug names are display-only and cached separately, so the URL
    // only has to carry ids.
    criteria = { ...criteria, ...(await labelSelections(criteria)) }
    try {
      result = await searchPlans(criteria)
    } catch (e) {
      error = errorMessage(e, 'Search failed.')
    }
  }

  return (
    <SearchForm
      criteria={criteria}
      filters={filters}
      openPlanId={openPlanId}
      result={result}
      error={error}
    />
  )
}
