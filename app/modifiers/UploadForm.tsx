'use client'
import { Upload } from 'lucide-react'
import { useActionState } from 'react'
import { uploadModifiers, type UploadState } from '@/app/actions/modifiers'
import { BANNER_SUCCESS, BANNER_WARN, BTN_SOLID, FIELD, LABEL, PANEL } from '@/app/ui/theme'

const FILE_INPUT =
  'text-paragraph-small text-brown-gravie-50 file:mr-3 file:rounded-xs file:border ' +
  'file:border-marketplace-orange-50 file:bg-white file:px-3 file:py-[6px] file:text-sm ' +
  'file:font-bold file:text-marketplace-orange-60 hover:file:bg-marketplace-orange-10'

export default function UploadForm() {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadModifiers, undefined)

  return (
    <div className={`${PANEL} space-y-4`}>
      <form action={action} className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className={LABEL}>CSV file</span>
          <input type="file" name="file" accept=".csv,text/csv" required className={FILE_INPUT} />
        </label>
        <label className="block grow">
          <span className={LABEL}>Note</span>
          <input
            name="note"
            placeholder="e.g. 2026 rates pulled from qa-main plancatalog"
            className={FIELD}
          />
        </label>
        <button type="submit" disabled={pending} className={`${BTN_SOLID} px-6`}>
          <Upload />
          {pending ? 'Importing…' : 'Import'}
        </button>
      </form>

      {state?.message && <p className={BANNER_SUCCESS}>{state.message}</p>}

      {state && state.unmappedColumns.length > 0 && (
        <p className="text-paragraph-extra-small text-brown-gravie-50">
          Ignored unrecognized columns: {state.unmappedColumns.join(', ')}
        </p>
      )}

      {state && state.errors.length > 0 && (
        <div className={BANNER_WARN}>
          <p className="text-paragraph-small font-bold text-ink-60">
            {state.errors.length} row {state.errors.length === 1 ? 'problem' : 'problems'}
          </p>
          <ul className="mt-1 space-y-0.5 text-paragraph-extra-small">
            {state.errors.slice(0, 20).map((e, i) => (
              <li key={i}>
                line {e.line}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
