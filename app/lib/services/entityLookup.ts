import {
  fetchDrugByRxcui,
  fetchProviderByNpi,
  searchDrugs,
  searchProviders,
} from '../ideon/client'
import type { DrugHit, ProviderHit, SelectedDrug, SelectedProvider } from '../ideon/types'
import {
  findLabels,
  findEntities,
  rememberLabels,
  type EntityKind,
  type EntityRecord,
} from '../repos/entityLabelRepo'

/**
 * Two ways in. A search records what it saw so a URL carrying bare ids can show
 * names again. A pasted identifier resolves the other direction — by NPI, or by
 * rxcui for drugs, which is the only drug id Ideon will look up.
 */

const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)

/** The descriptive fields the modal shows; all absent on a name-only cache row. */
function describe(source: { specialty?: unknown; type?: unknown; city?: unknown } | null | undefined) {
  return {
    specialty: str(source?.specialty),
    type: str(source?.type),
    city: str(source?.city),
  }
}

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
  const [providerRecords, drugLabels] = await Promise.all([
    findEntities('provider', input.providers.map((p) => String(p.npi))),
    findLabels('drug', input.drugs.map((d) => String(d.medId))),
  ])
  return {
    providers: input.providers.map((p) => {
      const hit = providerRecords.get(String(p.npi))
      return { ...p, name: hit?.label ?? p.name, ...describe(hit?.payload) }
    }),
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
  // A row warmed from a cohort CSV carries a name but no payload. That is enough to
  // label a chip and not enough for the details panel, so it is a fallback rather than
  // a hit: Ideon is still asked, and the cached name covers the ask failing.
  const cached = await findEntities('provider', npis)
  const learned: EntityRecord[] = []

  const rows = await mapCapped(npis, async (id) => {
    const hit = cached.get(id)
    if (hit?.payload) {
      return { provider: { npi: Number(id), name: hit.label, ...describe(hit.payload) }, ok: true }
    }

    const fetched = await fetchProviderByNpi(Number(id))
    if (!fetched) {
      // Named from the warm cache when it has one, else labelled by its own id.
      return { provider: { npi: Number(id), name: hit?.label ?? id }, ok: hit !== undefined }
    }

    learned.push({
      id,
      label: fetched.name,
      payload: { specialty: fetched.specialty, type: fetched.type, city: fetched.city },
    })
    return { provider: { npi: fetched.npi, name: fetched.name, ...describe(fetched) }, ok: true }
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
  const cached = await findEntities('drug_rxcui', rxcuis)
  const learned: EntityRecord[] = []
  // labelSelections reads `drug` by med_id, so a paste that only wrote `drug_rxcui`
  // came back from a shared URL labelled with its raw NDC.
  const byMedId: EntityRecord[] = []

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
    byMedId.push({ id: String(fetched.medId), label: fetched.name })
    return { drug: { medId: fetched.medId, ndc, name: fetched.name, rxcui }, ok: true }
  })

  await Promise.all([remember('drug_rxcui', learned), remember('drug', byMedId)])
  return {
    resolved: rows.map((r) => r.drug),
    unresolved: rxcuis.filter((_, i) => !rows[i].ok),
  }
}
