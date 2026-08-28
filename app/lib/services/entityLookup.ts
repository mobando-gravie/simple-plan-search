import { searchDrugs, searchProviders } from '../ideon/client'
import type { DrugHit, ProviderHit, SelectedDrug, SelectedProvider } from '../ideon/types'
import { findLabels, rememberLabels } from '../repos/entityLabelRepo'

/**
 * Ideon has no lookup by med_id or NPI, so a URL carrying bare ids cannot recover
 * the names. Every search records what it saw; a shared link reads them back.
 */

/** A failed write must not fail the search — the label is display-only. */
async function remember(kind: 'drug' | 'provider', rows: { id: string; label: string }[]) {
  try {
    await rememberLabels(kind, rows)
  } catch {
    // ignored on purpose
  }
}

export async function lookupDrugs(term: string): Promise<DrugHit[]> {
  const hits = await searchDrugs(term)
  await remember(
    'drug',
    hits.map((hit) => ({ id: String(hit.medId), label: hit.name })),
  )
  return hits
}

export async function lookupProviders(zip: string, term: string): Promise<ProviderHit[]> {
  const hits = await searchProviders(zip, term)
  await remember(
    'provider',
    hits.map((hit) => ({ id: String(hit.npi), label: hit.name })),
  )
  return hits
}

/** Fills in names for ids that arrived from a URL. An unknown id keeps the id as its label. */
export async function labelSelections(input: {
  providers: SelectedProvider[]
  drugs: SelectedDrug[]
}): Promise<{ providers: SelectedProvider[]; drugs: SelectedDrug[] }> {
  const [providerLabels, drugLabels] = await Promise.all([
    findLabels('provider', input.providers.map((p) => String(p.npi))),
    findLabels('drug', input.drugs.map((d) => String(d.medId))),
  ])
  return {
    providers: input.providers.map((p) => ({
      ...p,
      name: providerLabels.get(String(p.npi)) ?? p.name,
    })),
    drugs: input.drugs.map((d) => ({ ...d, name: drugLabels.get(String(d.medId)) ?? d.name })),
  }
}
