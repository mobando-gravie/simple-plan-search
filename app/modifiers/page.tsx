import { listBatches } from '@/app/lib/services/modifierService'
import { Muted } from '@/app/ui/Text'
import { CODE, CODE_BLOCK, H1, PAGE_SUBTITLE, PANEL } from '@/app/ui/theme'
import BatchList from './BatchList'
import UploadForm from './UploadForm'

export const dynamic = 'force-dynamic'

const SAMPLE = `hios_plan_id,carrier_id,state,rating_area,metal_level,effective_year,multiplier,flat_cents,label
74289NY2770005,,,,,2026,1.055,0,Oscar plan override
,,NY,,gold,2026,1.035,0,NY gold load
,,NY,,,2026,1.020,0,NY statewide default`

export default async function ModifiersPage() {
  const batches = await listBatches()

  return (
    <div className="space-y-8">
      <div>
        <h1 className={H1}>Gravie modifiers</h1>
        <p className={PAGE_SUBTITLE}>
          Each row applies <code className={CODE}>round(ideon × multiplier) + flat</code>. Blank
          key columns match anything; the most specific matching row wins. Importing a CSV
          deactivates every earlier batch.
        </p>
      </div>

      <UploadForm />

      <BatchList batches={batches} />

      <details className={`${PANEL} text-paragraph-small`}>
        <summary className="cursor-pointer text-paragraph-regular font-bold text-ink-50">
          CSV format
        </summary>
        <Muted className="mt-3">
          Column names are matched case-insensitively and ignore spaces, dashes and underscores, so
          a Gravie MySQL export usually drops in unchanged. Common aliases are accepted:{' '}
          <code className={CODE}>planId</code>, <code className={CODE}>metal</code>,{' '}
          <code className={CODE}>year</code>, <code className={CODE}>factor</code>. A flat amount
          written with a <code className={CODE}>$</code> or a decimal point is read as dollars; a
          bare integer as cents.
        </Muted>
        <pre className={`mt-3 ${CODE_BLOCK}`}>
          {SAMPLE}
        </pre>
      </details>
    </div>
  )
}
