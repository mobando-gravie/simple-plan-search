'use client'
import { Upload } from 'lucide-react'
import { useActionState } from 'react'
import { uploadModifiers, type UploadState } from '@/app/actions/modifiers'
import { plural } from '@/app/lib/text'
import { Button } from '@/app/ui/Button'
import { TEXT } from '@/app/ui/colors'
import { Field } from '@/app/ui/Field'
import { Muted } from '@/app/ui/Text'
import {
  BANNER_SUCCESS,
  BANNER_WARN,
  FILE_BUTTON,
  LABEL,
  MUTED,
  PANEL,
} from '@/app/ui/theme'

const FILE_INPUT = `${MUTED} ${FILE_BUTTON}`

export default function UploadForm() {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadModifiers, undefined)

  return (
    <div className={`${PANEL} space-y-4`}>
      <form action={action} className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className={LABEL}>CSV file</span>
          <input type="file" name="file" accept=".csv,text/csv" required className={FILE_INPUT} />
        </label>
        <Field
          label="Note"
          name="note"
          placeholder="e.g. 2026 rates pulled from qa-main plancatalog"
          className="grow"
        />
        <Button type="submit" pending={pending} pendingLabel="Importing…" className="px-6">
          <Upload />
          Import
        </Button>
      </form>

      {state?.message && <p className={BANNER_SUCCESS}>{state.message}</p>}

      {state && state.unmappedColumns.length > 0 && (
        <Muted size="xs">Ignored unrecognized columns: {state.unmappedColumns.join(', ')}</Muted>
      )}

      {state && state.errors.length > 0 && (
        <div className={BANNER_WARN}>
          <p className={`text-paragraph-small font-bold ${TEXT.heading}`}>
            {state.errors.length} row {plural(state.errors.length, 'problem', 'problems')}
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
