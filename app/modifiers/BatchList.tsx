import { activateBatch, removeBatch } from '@/app/actions/modifiers'
import type { ModifierBatch } from '@/app/lib/services/modifierService'

export default function BatchList({ batches }: { batches: ModifierBatch[] }) {
  if (batches.length === 0) {
    return <p className="text-sm text-zinc-500">No modifier batches imported yet.</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Batch</th>
            <th className="px-4 py-3 text-left font-medium">File</th>
            <th className="px-4 py-3 text-right font-medium">Rows</th>
            <th className="px-4 py-3 text-left font-medium">Uploaded</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
          {batches.map((batch) => (
            <tr key={batch.id}>
              <td className="tnum px-4 py-3 font-mono text-xs">#{batch.id}</td>
              <td className="px-4 py-3">
                {batch.filename}
                {batch.note && <div className="text-xs text-zinc-500">{batch.note}</div>}
              </td>
              <td className="tnum px-4 py-3 text-right">{batch.rowCount}</td>
              <td className="px-4 py-3 text-zinc-500">
                {batch.uploadedAt.toISOString().replace('T', ' ').slice(0, 16)}
              </td>
              <td className="px-4 py-3">
                {batch.active ? (
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    active
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">inactive</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-3">
                  <form action={activateBatch}>
                    <input type="hidden" name="batchId" value={batch.id} />
                    <input type="hidden" name="active" value={String(!batch.active)} />
                    <button className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                      {batch.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </form>
                  <form action={removeBatch}>
                    <input type="hidden" name="batchId" value={batch.id} />
                    <button className="text-xs text-zinc-400 hover:text-red-600">Delete</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
