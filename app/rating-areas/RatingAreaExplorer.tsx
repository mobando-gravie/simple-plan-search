'use client'
import { Check, Copy, Search } from 'lucide-react'
import { useState } from 'react'
import { formatCents } from '@/app/lib/money'
import { useSwr } from '@/app/lib/swr/useSwr'
import { Button } from '@/app/ui/Button'
import { cx } from '@/app/ui/cx'
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

  const cacheTag = fromCache ? <span className="text-ink-30"> **</span> : null

  if ('ratingArea' in result && 'counties' in result.ratingArea) {
    const a = result.ratingArea
    return (
      <div className="space-y-6">
        <ResultPanel data={result}>
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
        </ResultPanel>
        <AreaRatesPanel id={a.id} />
      </div>
    )
  }

  if ('areas' in result) {
    return (
      <ResultPanel data={result}>
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
      </ResultPanel>
    )
  }

  const r = result as ReverseResult
  return (
    <ResultPanel data={result}>
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
    </ResultPanel>
  )
}

type RatesResult = {
  ratingArea: string
  source: string
  referenceAges: number[]
  years: { year: number; cheapestCents: Record<string, number>; benchmarkSilverCents: Record<string, number> }[]
}

/** CMS historical premiums for the area: cheapest and benchmark-silver curves by age. */
function AreaRatesPanel({ id }: { id: string }) {
  const { data, pending, error } = useSwr<RatesResult>(`/api/rating-areas/${encodeURIComponent(id)}/rates`)
  const [year, setYear] = useState<number | null>(null)

  if (pending && !data) return null
  if (error || !data || data.years.length === 0) {
    return (
      <div className={PANEL}>
        <h3 className="text-paragraph-regular font-bold">Premiums</h3>
        <Muted className="mt-1">
          No CMS premium data — the federal Rate PUF covers HealthCare.gov states only.
        </Muted>
      </div>
    )
  }

  const latest = data.years[data.years.length - 1]
  const current = data.years.find((y) => y.year === year) ?? latest
  const csvUrl = `/api/rating-areas/${encodeURIComponent(id)}/rates?format=csv`

  return (
    <ResultPanel data={data}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 pr-8">
        <h3 className="text-paragraph-regular font-bold">Premiums · plan year {current.year}</h3>
        <Select
          label="Year"
          value={current.year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-28"
        >
          {[...data.years].reverse().map((y) => (
            <option key={y.year} value={y.year}>{y.year}</option>
          ))}
        </Select>
      </div>
      <Muted className="mt-1">Lowest-cost plan and the benchmark (2nd-lowest silver), non-tobacco sticker, by age.</Muted>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-paragraph-small tnum">
          <thead>
            <tr className="text-left text-ink-30">
              <th className="py-1 pr-4 font-normal">Age</th>
              {data.referenceAges.map((age) => (
                <th key={age} className="px-2 py-1 text-right font-normal">{age}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <RateRow label="Cheapest" ages={data.referenceAges} curve={current.cheapestCents} />
            <RateRow label="Benchmark silver" ages={data.referenceAges} curve={current.benchmarkSilverCents} />
          </tbody>
        </table>
      </div>
      <a href={csvUrl} download className="mt-4 inline-block text-paragraph-small text-brand-60 underline">
        Export all years (CSV)
      </a>
    </ResultPanel>
  )
}

function RateRow({ label, ages, curve }: { label: string; ages: number[]; curve: Record<string, number> }) {
  return (
    <tr className="border-t border-ink-10">
      <td className="py-2 pr-4 font-bold">{label}</td>
      {ages.map((age) => {
        const cents = curve[String(age)]
        return (
          <td key={age} className="px-2 py-2 text-right">
            {cents != null ? formatCents(cents) : <span className="text-ink-30">—</span>}
          </td>
        )
      })}
    </tr>
  )
}

/** A result card with a copy-JSON affordance in the corner. */
function ResultPanel({ data, children }: { data: unknown; children: React.ReactNode }) {
  return (
    <div className={`${PANEL} relative`}>
      <CopyJsonButton data={data} className="absolute right-3 top-3" />
      {children}
    </div>
  )
}

/** Copies the result as pretty-printed JSON; the icon flips to a check for a moment. */
function CopyJsonButton({ data, className }: { data: unknown; className?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (insecure context or denied permission) — nothing to do.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied JSON' : 'Copy JSON'}
      title={copied ? 'Copied' : 'Copy JSON'}
      className={cx(
        'rounded-xs p-1 text-ink-30 transition-colors hover:text-brand-60 [&_svg]:size-4',
        className,
      )}
    >
      {copied ? <Check /> : <Copy />}
    </button>
  )
}
