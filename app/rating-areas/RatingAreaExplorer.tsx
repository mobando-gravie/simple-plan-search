'use client'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/app/ui/Button'
import { Field, Select } from '@/app/ui/Field'
import { Muted } from '@/app/ui/Text'
import { useAsyncAction } from '@/app/ui/useAsyncAction'
import { CODE, PANEL } from '@/app/ui/theme'

type Mode = 'area' | 'zip' | 'county' | 'state'

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

export default function RatingAreaExplorer() {
  const [mode, setMode] = useState<Mode>('area')
  const [value, setValue] = useState('')
  const [states, setStates] = useState<StateRow[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const [csvUrl, setCsvUrl] = useState<string | null>(null)
  const { pending, run } = useAsyncAction()

  // States for the dropdown; the overview is tiny and edge-cached.
  useEffect(() => {
    fetch('/api/rating-areas')
      .then((r) => r.json())
      .then((d) => setStates(d.states ?? []))
      .catch(() => setStates([]))
  }, [])

  function lookup(nextMode: Mode, nextValue: string) {
    const v = nextValue.trim()
    if (!v) return
    const url = endpoint(nextMode, v)
    run(async () => {
      const res = await fetch(url)
      const body = await res.json()
      setResult(body)
      setCsvUrl(res.ok && 'error' in body === false ? withCsv(url) : null)
    })
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    lookup(mode, mode === 'state' && !value ? states[0]?.state ?? '' : value)
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

      {result && <ResultView result={result} onOpenArea={(id) => { setMode('area'); setValue(id); lookup('area', id) }} />}
    </div>
  )
}

function ResultView({ result, onOpenArea }: { result: Result; onOpenArea: (id: string) => void }) {
  if (result.error) {
    return (
      <div className={PANEL}>
        <p className="text-paragraph-regular font-bold">{result.error}</p>
        {result.hint && <Muted className="mt-1">{result.hint}</Muted>}
      </div>
    )
  }

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
        <Muted className="mt-1">Area definition: {result.basis}. Open one for its counties.</Muted>
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

  // Reverse lookup (zip or county).
  const r = result as ReverseResult
  return (
    <div className={PANEL}>
      <h2 className="text-header-h4 font-black">
        {r.county.name}, {r.state} → {r.ratingArea.id}
      </h2>
      <Muted className="mt-1">
        {r.zip ? `ZIP ${r.zip}` : `County ${r.countyFips}`} · FIPS {r.county.fips} · Rating Area {r.ratingArea.areaNumber}
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
