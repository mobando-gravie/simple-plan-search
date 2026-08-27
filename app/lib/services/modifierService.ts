import { parseModifierCsv, type ParseResult } from '../modifierCsv'
import {
  activeModifiers,
  deleteBatch,
  importBatch,
  listBatches,
  setBatchActive,
  type ModifierBatch,
} from '../repos/modifierRepo'

export type ImportOutcome = {
  batch: ModifierBatch | null
  imported: number
  errors: ParseResult['errors']
  unmappedColumns: string[]
}

export async function importModifierCsv(
  filename: string,
  text: string,
  note: string | null,
): Promise<ImportOutcome> {
  const parsed = parseModifierCsv(text)
  if (parsed.rows.length === 0) {
    return {
      batch: null,
      imported: 0,
      errors: parsed.errors.length > 0 ? parsed.errors : [{ line: 0, message: 'no rows to import' }],
      unmappedColumns: parsed.unmappedColumns,
    }
  }
  const batch = await importBatch({ filename, note, rows: parsed.rows })
  return {
    batch,
    imported: parsed.rows.length,
    errors: parsed.errors,
    unmappedColumns: parsed.unmappedColumns,
  }
}

export { activeModifiers, deleteBatch, listBatches, setBatchActive }
export type { ModifierBatch }
