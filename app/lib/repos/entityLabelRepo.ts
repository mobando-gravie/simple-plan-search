import { query } from '../db'

export type EntityKind = 'drug' | 'provider'

/** Remembers display names so ids arriving from a shared URL can be shown by name. */
export async function rememberLabels(
  kind: EntityKind,
  rows: { id: string; label: string }[],
): Promise<void> {
  if (rows.length === 0) return
  await query(
    `INSERT INTO sps_entity_label (kind, entity_id, label, seen_at)
     SELECT $1, id, label, now() FROM UNNEST($2::text[], $3::text[]) AS t(id, label)
     ON CONFLICT (kind, entity_id) DO UPDATE SET
       label   = EXCLUDED.label,
       seen_at = now()`,
    [kind, rows.map((r) => r.id), rows.map((r) => r.label)],
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
