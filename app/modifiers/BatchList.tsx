import { Trash2 } from 'lucide-react'
import { activateBatch, removeBatch } from '@/app/actions/modifiers'
import type { ModifierBatch } from '@/app/lib/services/modifierService'
import { BTN_TEXT, CHIP, TABLE_WRAP, TBODY, TD, TH, TH_RIGHT, THEAD, TR } from '@/app/ui/theme'

export default function BatchList({ batches }: { batches: ModifierBatch[] }) {
  if (batches.length === 0) {
    return (
      <p className="text-paragraph-small text-brown-gravie-50">
        No modifier batches imported yet.
      </p>
    )
  }

  return (
    <div className={TABLE_WRAP}>
      <table className="w-full">
        <thead className={THEAD}>
          <tr>
            <th className={TH}>Batch</th>
            <th className={TH}>File</th>
            <th className={TH_RIGHT}>Rows</th>
            <th className={TH}>Uploaded</th>
            <th className={TH}>Status</th>
            <th className={TH} />
          </tr>
        </thead>
        <tbody className={TBODY}>
          {batches.map((batch) => (
            <tr key={batch.id} className={TR}>
              <td className={`tnum ${TD} font-mono text-paragraph-extra-small`}>#{batch.id}</td>
              <td className={TD}>
                <span className="font-bold text-ink-60">{batch.filename}</span>
                {batch.note && (
                  <div className="text-paragraph-extra-small text-brown-gravie-50">{batch.note}</div>
                )}
              </td>
              <td className={`tnum ${TD} text-right`}>{batch.rowCount}</td>
              <td className={`${TD} text-brown-gravie-50`}>
                {batch.uploadedAt.toISOString().replace('T', ' ').slice(0, 16)}
              </td>
              <td className={TD}>
                {batch.active ? (
                  <span
                    className={`${CHIP} border-secondary-green-60 bg-secondary-green-10 text-secondary-green-70`}
                  >
                    active
                  </span>
                ) : (
                  <span className="text-paragraph-extra-small text-brown-gravie-30">inactive</span>
                )}
              </td>
              <td className={TD}>
                <div className="flex items-center justify-end gap-2">
                  <form action={activateBatch}>
                    <input type="hidden" name="batchId" value={batch.id} />
                    <input type="hidden" name="active" value={String(!batch.active)} />
                    <button className={BTN_TEXT}>{batch.active ? 'Deactivate' : 'Activate'}</button>
                  </form>
                  <form action={removeBatch}>
                    <input type="hidden" name="batchId" value={batch.id} />
                    <button className="inline-flex items-center gap-1 rounded-xs px-2 py-[6px] text-paragraph-extra-small font-bold text-brown-gravie-50 transition-colors hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
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
