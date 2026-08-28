'use server'
import { revalidatePath } from 'next/cache'
import {
  deleteBatch,
  importModifierCsv,
  setBatchActive,
  type ImportOutcome,
} from '@/app/lib/services/modifierService'

export type UploadState = (ImportOutcome & { message?: string }) | undefined

export async function uploadModifiers(
  _state: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { batch: null, imported: 0, errors: [{ line: 0, message: 'Choose a CSV file.' }], unmappedColumns: [] }
  }

  const note = String(formData.get('note') ?? '').trim() || null
  const outcome = await importModifierCsv(file.name, await file.text(), note)
  revalidatePath('/modifiers')
  return {
    ...outcome,
    message: outcome.batch
      ? `Imported ${outcome.imported} rows as batch #${outcome.batch.id}. Earlier batches were deactivated.`
      : undefined,
  }
}

/** A hidden form field, so a junk id is a broken client rather than a user error. */
function batchId(formData: FormData): number | null {
  const id = Number(formData.get('batchId'))
  return Number.isInteger(id) ? id : null
}

export async function activateBatch(formData: FormData) {
  const id = batchId(formData)
  if (id === null) return
  await setBatchActive(id, formData.get('active') === 'true')
  revalidatePath('/modifiers')
}

export async function removeBatch(formData: FormData) {
  const id = batchId(formData)
  if (id === null) return
  await deleteBatch(id)
  revalidatePath('/modifiers')
}
