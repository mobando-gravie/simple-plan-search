'use client'
import { useActionState } from 'react'
import { uploadModifiers, type UploadState } from '@/app/actions/modifiers'

export default function UploadForm() {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadModifiers, undefined)

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
      <form action={action} className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">CSV file</span>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="text-sm file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:file:border-zinc-700 dark:file:bg-zinc-900 dark:file:text-zinc-100"
          />
        </label>
        <label className="block grow">
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Note</span>
          <input
            name="note"
            placeholder="e.g. 2026 rates pulled from qa-main plancatalog"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? 'Importing…' : 'Import'}
        </button>
      </form>

      {state?.message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {state.message}
        </p>
      )}

      {state && state.unmappedColumns.length > 0 && (
        <p className="text-xs text-zinc-500">
          Ignored unrecognized columns: {state.unmappedColumns.join(', ')}
        </p>
      )}

      {state && state.errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            {state.errors.length} row {state.errors.length === 1 ? 'problem' : 'problems'}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-amber-800 dark:text-amber-300">
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
