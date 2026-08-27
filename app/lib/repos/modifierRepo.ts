import { query, queryOne } from '../db'
import type { GravieModifier } from '../modifier'
import type { ParsedModifierRow } from '../modifierCsv'

export type ModifierBatch = {
  id: number
  filename: string
  rowCount: number
  note: string | null
  active: boolean
  uploadedAt: Date
}

type ModifierRow = {
  id: string
  batch_id: string
  hios_plan_id: string | null
  carrier_id: string | null
  state: string | null
  rating_area: string | null
  metal_level: string | null
  effective_year: number | null
  multiplier: string
  flat_cents: string
  label: string | null
}

// Postgres returns BIGINT and NUMERIC as strings to protect precision; premiums here
// are far inside Number's safe range, so a plain cast is honest.
function toModifier(r: ModifierRow): GravieModifier {
  return {
    id: Number(r.id),
    batchId: Number(r.batch_id),
    hiosPlanId: r.hios_plan_id,
    carrierId: r.carrier_id,
    state: r.state,
    ratingArea: r.rating_area,
    metalLevel: r.metal_level,
    effectiveYear: r.effective_year,
    multiplier: Number(r.multiplier),
    flatCents: Number(r.flat_cents),
    label: r.label,
  }
}

export async function activeModifiers(): Promise<GravieModifier[]> {
  const rows = await query<ModifierRow>(
    `SELECT m.* FROM sps_gravie_modifier m
       JOIN sps_modifier_batch b ON b.id = m.batch_id
      WHERE b.active
      ORDER BY m.id`,
  )
  return rows.map(toModifier)
}

type BatchRow = {
  id: string
  filename: string
  row_count: number
  note: string | null
  active: boolean
  uploaded_at: string
}

function toBatch(r: BatchRow): ModifierBatch {
  return {
    id: Number(r.id),
    filename: r.filename,
    rowCount: r.row_count,
    note: r.note,
    active: r.active,
    uploadedAt: new Date(r.uploaded_at),
  }
}

export async function listBatches(): Promise<ModifierBatch[]> {
  const rows = await query<BatchRow>(`SELECT * FROM sps_modifier_batch ORDER BY uploaded_at DESC`)
  return rows.map(toBatch)
}

export async function setBatchActive(batchId: number, active: boolean): Promise<void> {
  await query(`UPDATE sps_modifier_batch SET active = $2 WHERE id = $1`, [batchId, active])
}

export async function deleteBatch(batchId: number): Promise<void> {
  await query(`DELETE FROM sps_modifier_batch WHERE id = $1`, [batchId])
}

/**
 * Imports one CSV as a new batch and deactivates every previous one, so a bad
 * upload is undone by reactivating its predecessor rather than by re-importing.
 */
export async function importBatch(input: {
  filename: string
  note: string | null
  rows: ParsedModifierRow[]
}): Promise<ModifierBatch> {
  const created = await queryOne<BatchRow>(
    `INSERT INTO sps_modifier_batch (filename, row_count, note, active)
     VALUES ($1, $2, $3, TRUE) RETURNING *`,
    [input.filename, input.rows.length, input.note],
  )
  if (!created) throw new Error('failed to create modifier batch')
  const batchId = Number(created.id)

  // One multi-row INSERT: the HTTP driver bills a round trip per statement.
  if (input.rows.length > 0) {
    const values: unknown[] = []
    const tuples = input.rows.map((row, i) => {
      const base = i * 10
      values.push(
        batchId,
        row.hiosPlanId,
        row.carrierId,
        row.state,
        row.ratingArea,
        row.metalLevel,
        row.effectiveYear,
        row.multiplier,
        row.flatCents,
        row.label,
      )
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`
    })
    await query(
      `INSERT INTO sps_gravie_modifier
         (batch_id, hios_plan_id, carrier_id, state, rating_area, metal_level,
          effective_year, multiplier, flat_cents, label)
       VALUES ${tuples.join(', ')}`,
      values,
    )
  }

  await query(`UPDATE sps_modifier_batch SET active = FALSE WHERE id <> $1`, [batchId])
  return toBatch(created)
}
