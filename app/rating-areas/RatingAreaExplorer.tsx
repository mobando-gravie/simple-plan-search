'use client'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useSwr } from '@/app/lib/swr/useSwr'
import { Button } from '@/app/ui/Button'
import { Field, Select } from '@/app/ui/Field'
import { Muted } from '@/app/ui/Text'
import { CODE, PANEL } from '@/app/ui/theme'
import { lookupQuery, type Lookup, type Mode } from './lookupParams'

type County = { fips: string; name: string }
type AreaResult = {
  ratingArea: { id: string; stateName: string | null; areaNumber: number; basis: string; counties: County[]; zip3: string[] }
}
type StateResult = {
  state: string
  stateName: string
  basis: string
  areas: { id: string; areaNumber: number; countyCount: number }[]
}
type ReverseResult = {
  zip?: string
  countyFips?: string
  state: string
  county: County
  ratingArea: { id: string; areaNumber: number; stateName: string | null }
}
type Result = (AreaResult | StateResult | ReverseResult) & { error?: string; hint?: string }
type StateRow = { state: string; stateName: string }

const PROMPT: Record<Mode, string> = {
  area: 'Rating area (e.g. MN07)',
  zip: 'ZIP code',
  county: 'County FIPS (5 digits)',
  state: 'State',
}

/** The JSON endpoint for the current query; the CSV download is the same plus format=csv. */
function endpoint(mode: Mode, value: string): string {
  const v = value.trim()
  if (mode === 'area') return `/api/rating-areas/${encodeURIComponent(v)}`
  const key = mode === 'zip' ? 'zip' : mode === 'county' ? 'county_fips' : 'state'
  return `/api/rating-areas?${key}=${encodeURIComponent(v)}`
}
function withCsv(url: string): string {
  return url + (url.includes('?') ? '&' : '?') + 'format=csv'
}

export default function RatingAreaExplorer({ initial }: { initial?: Lookup | null }) {
  const [mode, setMode] = useState<Mode>(initial?.mode ?? 'area')
  const [value, setValue] = useState(initial?.value ?? '')
  const [queryUrl, setQueryUrl] = useState<string | null>(
    initial ? endpoint(initial.mode, initial.value) : null,
  )

  // Both the state dropdown and the lookup go through the 48h IndexedDB cache.
  const states = useSwr<{ states: StateRow[] }>('/api/rating-areas').data?.states ?? []
  const { data: result, pending, source } = useSwr<Result>(queryUrl)
  const csvUrl = queryUrl && result && !result.error ? withCsv(queryUrl) : null

  function open(nextMode: Mode, nextValue: string) {
    const v = nextValue.trim()
    if (!v) return
    setQueryUrl(endpoint(nextMode, v))
    // Reflect the lookup into the address bar so the link reproduces it; replace, not push,
    // so repeated lookups and drill-downs don't pile up history entries.
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?${lookupQuery(nextMode, v)}`)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    open(mode, mode === 'state' && !value ? states[0]?.state ?? '' : value)
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
          className="w-44"
        >
          <option value="area">Rating area</option>
          <option value="zip">ZIP code</option>
          <option value="county">County FIPS</option>
          <option value="state">State</option>
        </Select>

        {mode === 'state' ? (
          <Select label="State" value={value} onChange={(e) => setValue(e.target.value)} className="w-56">
            <option value="">Choose a state…</option>
            {states.map((s) => (
              <option key={s.state} value={s.state}>
                {s.stateName} ({s.state})
              </option>
            ))}
          </Select>
        ) : (
          <Field
            label={PROMPT[mode]}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            icon={<Search />}
            width="w-64"
          />
        )}

        <Button type="submit" pending={pending} pendingLabel="Looking up…">
          Look up
        </Button>
        {csvUrl && (
          <a href={csvUrl} download className="ml-auto self-center text-paragraph-small text-brand-60 underline">
            Export CSV
          </a>
        )}
      </form>

      {result && (
        <ResultView
          result={result}
          fromCache={source === 'cache'}
          onOpenArea={(id) => { setMode('area'); setValue(id); open('area', id) }}
        />
      )}
    </div>
  )
}

function ResultView({
  result,
  fromCache,
  onOpenArea,
}: {
  result: Result
  fromCache: boolean
  onOpenArea: (id: string) => void
}) {
  if (result.error) {
    return (
      <div className={PANEL}>
        <p className="text-paragraph-regular font-bold">{result.error}</p>
        {result.hint && <Muted className="mt-1">{result.hint}</Muted>}
      </div>
    )
  }

  const cacheTag = fromCache ? <span className="text-ink-30"> · cached</span> : null

  if ('ratingArea' in result && 'counties' in result.ratingArea) {
    const a = result.ratingArea
    return (
      <div className={PANEL}>
        <h2 className="text-header-h4 font-black">
          {a.id} — {a.stateName}, Rating Area {a.areaNumber}
        </h2>
        <Muted className="mt-1">
          {a.counties.length > 0
            ? `${a.counties.length} ${a.counties.length === 1 ? 'county' : 'counties'}`
            : `${a.zip3.length} ZIP prefixes`}
          {cacheTag}
        </Muted>
        {a.counties.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            {a.counties.map((c) => (
              <li key={c.fips} className="text-paragraph-small">
                {c.name} <span className="text-ink-30">· {c.fips}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-paragraph-small">
            {a.zip3.map((z) => (
              <code key={z} className={`${CODE} mr-1`}>{z}xx</code>
            ))}
          </p>
        )}
      </div>
    )
  }

  if ('areas' in result) {
    return (
      <div className={PANEL}>
        <h2 className="text-header-h4 font-black">
          {result.stateName} ({result.state}) — {result.areas.length} rating areas
        </h2>
        <Muted className="mt-1">Area definition: {result.basis}. Open one for its counties.{cacheTag}</Muted>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {result.areas.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onOpenArea(a.id)}
                className="w-full rounded-sm border border-ink-10 px-3 py-2 text-left text-paragraph-small hover:border-brand-60"
              >
                <span className="font-bold">{a.id}</span>
                <span className="text-ink-30"> · {a.countyCount} counties</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const r = result as ReverseResult
  return (
    <div className={PANEL}>
      <h2 className="text-header-h4 font-black">
        {r.county.name}, {r.state} → {r.ratingArea.id}
      </h2>
      <Muted className="mt-1">
        {r.zip ? `ZIP ${r.zip}` : `County ${r.countyFips}`} · FIPS {r.county.fips} · Rating Area {r.ratingArea.areaNumber}
        {cacheTag}
      </Muted>
      <button
        type="button"
        onClick={() => onOpenArea(r.ratingArea.id)}
        className="mt-3 text-paragraph-small text-brand-60 underline"
      >
        View all counties in {r.ratingArea.id}
      </button>
    </div>
  )
}
