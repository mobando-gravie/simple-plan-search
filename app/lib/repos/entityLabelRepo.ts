import { query } from '../db'

export type EntityKind = 'drug' | 'drug_rxcui' | 'provider'

/** Whatever the label cannot hold: a drug's NDC and med_id, a provider's specialty. */
export type EntityRecord = { id: string; label: string; payload?: Record<string, unknown> | null }

/** Remembers display names so ids arriving from a shared URL can be shown by name. */
export async function rememberLabels(kind: EntityKind, rows: EntityRecord[]): Promise<void> {
  if (rows.length === 0) return
  await query(
    `INSERT INTO sps_entity_label (kind, entity_id, label, payload, seen_at)
     SELECT $1, id, label, NULLIF(payload, 'null'::jsonb), now()
       FROM UNNEST($2::text[], $3::text[], $4::jsonb[]) AS t(id, label, payload)
     ON CONFLICT (kind, entity_id) DO UPDATE SET
       label   = EXCLUDED.label,
       -- A row written by the typeahead has no payload; it must not blank one
       -- an identifier resolve already stored.
       payload = COALESCE(EXCLUDED.payload, sps_entity_label.payload),
       seen_at = now()`,
    [
      kind,
      rows.map((r) => r.id),
      rows.map((r) => r.label),
      rows.map((r) => JSON.stringify(r.payload ?? null)),
    ],
  )
}

export async function findLabels(kind: EntityKind, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const rows = await query<{ entity_id: string; label: string }>(
    `SELECT entity_id, label FROM sps_entity_label WHERE kind = $1 AND entity_id = ANY($2::text[])`,
    [kind, ids],
  )
  return new Map(rows.map((row) => [row.entity_id, row.label]))
}

/**
 * Label and payload together. Rows warmed from a cohort CSV have no payload — enough
 * to name a provider, not enough to rebuild a drug, so the caller decides what counts.
 */
export async function findEntities(
  kind: EntityKind,
  ids: string[],
): Promise<Map<string, EntityRecord>> {
  if (ids.length === 0) return new Map()
  const rows = await query<{
    entity_id: string
    label: string
    payload: Record<string, unknown> | null
  }>(
    `SELECT entity_id, label, payload FROM sps_entity_label
      WHERE kind = $1 AND entity_id = ANY($2::text[])`,
    [kind, ids],
  )
  return new Map(
    rows.map((r) => [r.entity_id, { id: r.entity_id, label: r.label, payload: r.payload }]),
  )
}
