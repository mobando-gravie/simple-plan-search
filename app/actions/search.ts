'use server'
import { errorMessage } from '@/app/lib/errors'
import { labelSelections } from '@/app/lib/services/entityLookup'
import { searchPlans } from '@/app/lib/services/planSearch'
import { decodeUrlState } from '@/app/lib/urlState'

/**
 * Busts the 24h plan cache for the search the URL describes. Deliberately not a
 * URL parameter: a shared link must not re-fetch Ideon for whoever opens it.
 */
export async function refreshSearch(search: string): Promise<{ error?: string }> {
  const { criteria } = decodeUrlState(new URLSearchParams(search))
  if (!criteria) return { error: 'Nothing to refresh — run a search first.' }
  try {
    const labelled = await labelSelections(criteria)
    await searchPlans({ ...criteria, ...labelled }, { refresh: true })
    return {}
  } catch (e) {
    return { error: errorMessage(e, 'Refresh failed.') }
  }
}
