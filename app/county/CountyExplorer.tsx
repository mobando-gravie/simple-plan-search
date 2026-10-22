'use client'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useSwr } from '@/app/lib/swr/useSwr'
import { Button } from '@/app/ui/Button'
import { Field, Select } from '@/app/ui/Field'
import { Muted } from '@/app/ui/Text'
import { PANEL } from '@/app/ui/theme'

type Mode = 'zip' | 'fips'
type County = {
  fips: string
  countyName: string | null
  state: string
  total: number
  issuers: { issuerId: string; name: string; enrollment: number }[]
  demographics: Record<string, number>
}
type Result = { planYear: number; county: County } & { error?: string; hint?: string }

const DEMO_GROUPS: { title: string; keys: [string, string][] }[] = [
  { title: 'Sex', keys: [['female', 'Female'], ['male', 'Male']] },
  { title: 'Age', keys: [['age_0_17', '0–17'], ['age_18_34', '18–34'], ['age_35_54', '35–54'], ['age_55_plus', '55+']] },
  {
    title: 'Household income (FPL)',
    keys: [['fpl_under_138', '<138%'], ['fpl_138_250', '138–250%'], ['fpl_250_400', '250–400%'], ['fpl_over_400', '>400%'], ['fpl_unknown', 'Unknown']],
  },
  { title: 'Tobacco', keys: [['smoker', 'Smokers']] },
]

const n = (v: number) => v.toLocaleString('en-US')

export default function CountyExplorer({
  initialFips,
  initialZip,
}: {
  initialFips?: string
  initialZip?: string
}) {
  const [mode, setMode] = useState<Mode>(initialFips ? 'fips' : 'zip')
  const [value, setValue] = useState(initialFips ?? initialZip ?? '')
  const [query, setQuery] = useState<string | null>(
    initialFips ? `?fips=${initialFips}` : initialZip ? `?zip=${initialZip}` : null,
  )

  const { data: result, pending } = useSwr<Result>(query ? `/api/county${query}` : null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const v = value.trim()
    if (!v) return
    const q = mode === 'fips' ? `?fips=${encodeURIComponent(v)}` : `?zip=${encodeURIComponent(v)}`
    setQuery(q)
    if (typeof window !== 'undefined') window.history.replaceState(null, '', q)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <Select
          label="Look up by"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as Mode)
            setValue('')
          }}
          className="w-40"
        >
          <option value="zip">ZIP code</option>
          <option value="fips">County FIPS</option>
        </Select>
        <Field
          label={mode === 'zip' ? 'ZIP code' : 'County FIPS (5 digits)'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          icon={<Search />}
          width="w-64"
        />
        <Button type="submit" pending={pending} pendingLabel="Looking up…">
          Look up
        </Button>
        {query && result && !result.error && (
          <a
            href={`/api/county${query}&format=csv`}
            download
            className="ml-auto self-center text-paragraph-small text-brand-60 underline"
          >
            Export CSV
          </a>
        )}
      </form>

      {result?.error && (
        <div className={PANEL}>
          <p className="text-paragraph-regular font-bold">{result.error}</p>
          {result.hint && <Muted className="mt-1">{result.hint}</Muted>}
        </div>
      )}
      {result && !result.error && <CountyView planYear={result.planYear} county={result.county} />}
    </div>
  )
}

function CountyView({ planYear, county }: { planYear: number; county: County }) {
  return (
    <div className="space-y-6">
      <div className={PANEL}>
        <h2 className="text-header-h4 font-black">
          {county.countyName ?? county.fips}, {county.state}
        </h2>
        <Muted className="mt-1">
          {n(county.total)} average monthly enrollees · FIPS {county.fips} · plan year {planYear}
        </Muted>

        <h3 className="mt-5 text-paragraph-regular font-bold">Issuers</h3>
        <ul className="mt-2 space-y-1">
          {county.issuers.map((is) => {
            const pct = county.total > 0 ? Math.round((is.enrollment / county.total) * 100) : 0
            return (
              <li key={is.issuerId} className="flex justify-between gap-3 text-paragraph-small tnum">
                <span className="min-w-0">{is.name}</span>
                <span className="shrink-0 text-ink-30">{n(is.enrollment)} · {pct}%</span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className={PANEL}>
        <h3 className="text-paragraph-regular font-bold">Enrollee demographics</h3>
        <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {DEMO_GROUPS.map((g) => (
            <div key={g.title}>
              <h4 className="text-paragraph-small font-bold text-ink-60">{g.title}</h4>
              <ul className="mt-1 space-y-0.5">
                {g.keys.map(([key, label]) => (
                  <li key={key} className="flex justify-between text-paragraph-small tnum">
                    <span className="text-ink-60">{label}</span>
                    <span>{n(county.demographics[key] ?? 0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
