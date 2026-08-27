import { listBatches } from '@/app/lib/services/modifierService'
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
        <h1 className="text-2xl font-semibold tracking-tight">Gravie modifiers</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Each row applies <code className="font-mono text-xs">round(ideon × multiplier) + flat</code>.
          Blank key columns match anything; the most specific matching row wins. Importing a CSV
          deactivates every earlier batch.
        </p>
      </div>

      <UploadForm />

      <BatchList batches={batches} />

      <details className="rounded-xl border border-zinc-200 p-6 text-sm dark:border-zinc-800">
        <summary className="cursor-pointer font-medium">CSV format</summary>
        <p className="mt-3 text-zinc-500">
          Column names are matched case-insensitively and ignore spaces, dashes and underscores, so
          a Gravie MySQL export usually drops in unchanged. Common aliases are accepted
          (<code className="font-mono text-xs">planId</code>, <code className="font-mono text-xs">metal</code>,{' '}
          <code className="font-mono text-xs">year</code>, <code className="font-mono text-xs">factor</code>).
          A flat amount written with a <code className="font-mono text-xs">$</code> or a decimal
          point is read as dollars; a bare integer as cents.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-50 p-4 font-mono text-xs dark:bg-zinc-900">
          {SAMPLE}
        </pre>
      </details>
    </div>
  )
}
