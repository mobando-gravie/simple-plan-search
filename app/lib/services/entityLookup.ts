import {
  fetchDrugByRxcui,
  fetchProviderByNpi,
  searchDrugs,
  searchProviders,
} from '../ideon/client'
import type { DrugHit, ProviderHit, SelectedDrug, SelectedProvider } from '../ideon/types'
import {
  findLabels,
  findRecords,
  rememberLabels,
  type EntityKind,
  type EntityRecord,
} from '../repos/entityLabelRepo'

/**
 * Two ways in. A search records what it saw so a URL carrying bare ids can show
 * names again. A pasted identifier resolves the other direction — by NPI, or by
 * rxcui for drugs, which is the only drug id Ideon will look up.
 */

/** A failed write must not fail the search — the label is display-only. */
async function remember(kind: EntityKind, rows: EntityRecord[]) {
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

export type Resolution<T> = { resolved: T[]; unresolved: string[] }

// One HTTP round-trip per identifier — Ideon publishes no batch lookup. Six at once
// tripped Ideon's rate limiter (429 with Retry-After: 12) while warming a cohort, so
// this stays low; the client retries a 429 on top of it.
const RESOLVE_CONCURRENCY = 3

async function mapCapped<In, Out>(items: In[], fn: (item: In) => Promise<Out>): Promise<Out[]> {
  const out: Out[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(RESOLVE_CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return out
}

/**
 * A pasted NPI that does not resolve is still selected, labelled by its own id: the
 * plan search sends only the npi, and Ideon returns an unknown one as not in network.
 * So a failed lookup costs the display name, never the coverage answer.
 */
export async function resolveProviders(npis: string[]): Promise<Resolution<SelectedProvider>> {
  // findLabels, not findRecords: a provider selection is just { npi, name }, so a
  // name-only row — such as one warmed from a cohort CSV — is already a complete hit.
  const cached = await findLabels('provider', npis)
  const learned: EntityRecord[] = []

  const rows = await mapCapped(npis, async (id) => {
    const name = cached.get(id)
    if (name) return { provider: { npi: Number(id), name }, ok: true }

    const fetched = await fetchProviderByNpi(Number(id))
    if (!fetched) return { provider: { npi: Number(id), name: id }, ok: false }

    learned.push({
      id,
      label: fetched.name,
      payload: { specialty: fetched.specialty, city: fetched.city },
    })
    return { provider: { npi: fetched.npi, name: fetched.name }, ok: true }
  })

  await remember('provider', learned)
  return {
    resolved: rows.map((r) => r.provider),
    unresolved: npis.filter((_, i) => !rows[i].ok),
  }
}

/**
 * Unlike a provider, an unresolved drug keeps a null NDC — it cannot be asked about,
 * and the display layer counts it as not covered rather than dropping it.
 */
export async function resolveDrugs(rxcuis: string[]): Promise<Resolution<SelectedDrug>> {
  const cached = await findRecords('drug_rxcui', rxcuis)
  const learned: EntityRecord[] = []

  const rows = await mapCapped(rxcuis, async (id) => {
    const rxcui = Number(id)
    const hit = cached.get(id)
    const cachedNdc = hit?.payload?.ndc
    if (hit && typeof cachedNdc === 'string') {
      const drug = { medId: Number(hit.payload?.medId ?? 0), ndc: cachedNdc, name: hit.label, rxcui }
      return { drug, ok: true }
    }

    const fetched = await fetchDrugByRxcui(rxcui)
    const ndc = fetched?.packages[0]?.ndc ?? null
    if (!fetched || !ndc) {
      return { drug: { medId: 0, ndc: null, name: `RxCUI ${id}`, rxcui }, ok: false }
    }

    learned.push({ id, label: fetched.name, payload: { ndc, medId: fetched.medId } })
    return { drug: { medId: fetched.medId, ndc, name: fetched.name, rxcui }, ok: true }
  })

  await remember('drug_rxcui', learned)
  return {
    resolved: rows.map((r) => r.drug),
    unresolved: rxcuis.filter((_, i) => !rows[i].ok),
  }
}
