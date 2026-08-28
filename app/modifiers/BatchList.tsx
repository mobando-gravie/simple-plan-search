import { Trash2 } from 'lucide-react'
import { activateBatch, removeBatch } from '@/app/actions/modifiers'
import { formatTimestamp } from '@/app/lib/dates'
import type { ModifierBatch } from '@/app/lib/services/modifierService'
import { Button } from '@/app/ui/Button'
import { Chip } from '@/app/ui/Chip'
import { TEXT } from '@/app/ui/colors'
import { EmptyState } from '@/app/ui/Text'
import { FAINT_XS, MUTED_XS, TABLE_WRAP, TBODY, TD, TH, TH_RIGHT, THEAD, TR } from '@/app/ui/theme'

export default function BatchList({ batches }: { batches: ModifierBatch[] }) {
  if (batches.length === 0) {
    return <EmptyState>No modifier batches imported yet.</EmptyState>
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
                <span className={`font-bold ${TEXT.heading}`}>{batch.filename}</span>
                {batch.note && <div className={MUTED_XS}>{batch.note}</div>}
              </td>
              <td className={`tnum ${TD} text-right`}>{batch.rowCount}</td>
              <td className={`${TD} ${TEXT.muted}`}>{formatTimestamp(batch.uploadedAt)}</td>
              <td className={TD}>
                {batch.active ? (
                  <Chip tone="green">active</Chip>
                ) : (
                  <span className={FAINT_XS}>inactive</span>
                )}
              </td>
              <td className={TD}>
                <div className="flex items-center justify-end gap-2">
                  <form action={activateBatch}>
                    <input type="hidden" name="batchId" value={batch.id} />
                    <input type="hidden" name="active" value={String(!batch.active)} />
                    <Button variant="text">{batch.active ? 'Deactivate' : 'Activate'}</Button>
                  </form>
                  <form action={removeBatch}>
                    <input type="hidden" name="batchId" value={batch.id} />
                    <Button variant="textDestructive">
                      <Trash2 />
                      Delete
                    </Button>
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
