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

export async function activateBatch(formData: FormData) {
  const id = Number(formData.get('batchId'))
  const active = formData.get('active') === 'true'
  if (Number.isInteger(id)) {
    await setBatchActive(id, active)
    revalidatePath('/modifiers')
  }
}

export async function removeBatch(formData: FormData) {
  const id = Number(formData.get('batchId'))
  if (Number.isInteger(id)) {
    await deleteBatch(id)
    revalidatePath('/modifiers')
  }
}
