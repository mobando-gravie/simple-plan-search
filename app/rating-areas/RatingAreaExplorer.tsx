'use client'
import { ArrowRight, Check, Copy, Download, MapPinned, Search } from 'lucide-react'
import { useState } from 'react'
import { formatCents } from '@/app/lib/money'
import { useSwr } from '@/app/lib/swr/useSwr'
import { Button, ButtonLink } from '@/app/ui/Button'
import { FOCUS_RING, HOVER, TEXT } from '@/app/ui/colors'
import { cx } from '@/app/ui/cx'
import { Field, Select } from '@/app/ui/Field'
import { Figure, FigureStrip } from '@/app/ui/Figure'
import { Panel } from '@/app/ui/Panel'
import { ShareList } from '@/app/ui/ShareList'
import { EmptyPanel, ErrorState, LoadingState } from '@/app/ui/Text'
import {
  CODE,
  DIVIDED_LIST,
  PANEL,
  TD_DENSE,
  TD_NUM,
  TD_STICKY,
  TH_DENSE,
  THEAD,
  TILE,
} from '@/app/ui/theme'
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

/** One of each lookup, for the blank slate. */
const EXAMPLES: { mode: Mode; value: string; label: string }[] = [
  { mode: 'area', value: 'MN07', label: 'Rating area MN07' },
  { mode: 'zip', value: '55401', label: 'ZIP 55401' },
  { mode: 'county', value: '27053', label: 'County FIPS 27053' },
  { mode: 'state', value: 'MN', label: 'All of Minnesota' },
]

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

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

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

  function pick(nextMode: Mode, nextValue: string) {
    setMode(nextMode)
    setValue(nextValue)
    open(nextMode, nextValue)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    open(mode, mode === 'state' && !value ? states[0]?.state ?? '' : value)
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className={`${PANEL} grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end`}
      >
        <Select
          label="Look up by"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as Mode)
            setValue('')
          }}
          width="w-full sm:w-44"
        >
          <option value="area">Rating area</option>
          <option value="zip">ZIP code</option>
          <option value="county">County FIPS</option>
          <option value="state">State</option>
        </Select>

        {mode === 'state' ? (
          <Select
            label="State"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            width="w-full sm:w-64"
          >
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
            width="w-full sm:w-64"
            autoComplete="off"
          />
        )}

        <Button type="submit" pending={pending} pendingLabel="Looking up…" className="w-full sm:w-auto">
          <Search />
          Look up
        </Button>
        {csvUrl && (
          <ButtonLink href={csvUrl} download className="w-full sm:ml-auto sm:w-auto">
            <Download />
            Export CSV
          </ButtonLink>
        )}
      </form>

      {!queryUrl && (
        <EmptyPanel
          icon={<MapPinned />}
          title="Look up a rating area"
          actions={EXAMPLES.map((ex) => (
            <Button key={ex.value} type="button" variant="outline" onClick={() => pick(ex.mode, ex.value)}>
              {ex.label}
            </Button>
          ))}
        >
          Start from an area id, a ZIP, a county FIPS, or a whole state. Try one of these:
        </EmptyPanel>
      )}

      {pending && !result && <LoadingState>Looking up…</LoadingState>}

      {result && (
        <ResultView
          result={result}
          fromCache={source === 'cache'}
          onOpenArea={(id) => pick('area', id)}
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
  if (result.error) return <ErrorState message={result.error} hint={result.hint} />

  const cacheTag = fromCache ? <CacheTag /> : null

  if ('ratingArea' in result && 'counties' in result.ratingArea) {
    const a = result.ratingArea
    const byCounty = a.counties.length > 0
    return (
      <div className="space-y-6">
        <Panel
          title={a.id}
          subtitle={
            <>
              {a.stateName} · Rating Area {a.areaNumber} ·{' '}
              {byCounty ? count(a.counties.length, 'county', 'counties') : count(a.zip3.length, 'ZIP prefix', 'ZIP prefixes')}
              {cacheTag}
            </>
          }
          actions={<CopyJsonButton data={result} />}
        >
          {byCounty ? (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-3 lg:grid-cols-4">
              {a.counties.map((c) => (
                <li key={c.fips} className={`min-w-0 text-paragraph-small ${TEXT.body}`}>
                  {c.name}{' '}
                  <span className={`tnum whitespace-nowrap ${TEXT.faint}`}>· {c.fips}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex flex-wrap gap-1.5">
              {a.zip3.map((z) => (
                <code key={z} className={CODE}>{z}xx</code>
              ))}
            </p>
          )}
        </Panel>
        <AreaRatesPanel id={a.id} />
      </div>
    )
  }

  if ('areas' in result) {
    return (
      <Panel
        title={`${result.stateName} (${result.state})`}
        subtitle={
          <>
            {count(result.areas.length, 'rating area', 'rating areas')} · area definition: {result.basis}. Open one for its counties.
            {cacheTag}
          </>
        }
        actions={<CopyJsonButton data={result} />}
      >
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {result.areas.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => onOpenArea(a.id)} className={TILE}>
                <span className={`block font-bold ${TEXT.heading}`}>{a.id}</span>
                <span className={`block ${TEXT.muted}`}>{count(a.countyCount, 'county', 'counties')}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    )
  }

  const r = result as ReverseResult
  return (
    <Panel
      title={`${r.county.name}, ${r.state}`}
      subtitle={
        <>
          {r.zip ? `ZIP ${r.zip}` : `County ${r.countyFips}`} · FIPS {r.county.fips}
          {cacheTag}
        </>
      }
      actions={<CopyJsonButton data={result} />}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Figure
          label="Rating area"
          value={r.ratingArea.id}
          detail={`${r.ratingArea.stateName ?? r.state} · Rating Area ${r.ratingArea.areaNumber}`}
        />
        <Button type="button" variant="outline" onClick={() => onOpenArea(r.ratingArea.id)}>
          All counties in {r.ratingArea.id}
          <ArrowRight />
        </Button>
      </div>
    </Panel>
  )
}

/** The terse cache marker, kept from before; the title says what it means. */
function CacheTag() {
  return (
    <span className={TEXT.faint} title="Served from the local cache">
      {' '}
      **
    </span>
  )
}

type RatesResult = {
  ratingArea: string
  source: string
  referenceAges: number[]
  years: { year: number; cheapestCents: Record<string, number>; benchmarkSilverCents: Record<string, number> }[]
}

type StateMarket = {
  state: string
  stateName: string
  year: number
  total: number
  metalMix: Record<string, number>
  topIssuers: { issuerId: string; name: string; enrollment: number }[]
}

const enrInt = (v: number) => v.toLocaleString('en-US')
const enrPct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

/**
 * Fallback for a state-based-exchange area, which the CMS Rate PUF does not cover: the state's
 * enrollment market instead — size, metal mix and top issuer, linking to the full page.
 */
function StateMarketPanel({ state, market }: { state: string; market?: StateMarket | null }) {
  const metals = market ? Object.entries(market.metalMix).sort((a, b) => b[1] - a[1]) : []
  const topMetal = metals[0]
  const topIssuer = market?.topIssuers[0]
  return (
    <Panel
      as="h3"
      title="Market snapshot"
      subtitle="CMS doesn’t publish premiums for state-run exchanges — here’s who enrolled instead."
      actions={
        market && (
          <ButtonLink href={`/enrollment?state=${encodeURIComponent(state)}`} variant="text">
            Full enrollment
            <ArrowRight />
          </ButtonLink>
        )
      }
    >
      {market && (
        <div className="space-y-6">
          <FigureStrip>
            <Figure label="Enrollees" value={enrInt(market.total)} detail={`avg monthly · ${market.year}`} />
            {topMetal && (
              <Figure label="Top metal" value={topMetal[0]} detail={`${enrPct(topMetal[1], market.total)}% of enrollees`} />
            )}
            {topIssuer && (
              <Figure
                label="Top issuer"
                value={topIssuer.name}
                size="md"
                detail={`${enrPct(topIssuer.enrollment, market.total)}% share`}
                className="col-span-2 sm:max-w-xs"
              />
            )}
          </FigureStrip>
          <div>
            <h4 className={`mb-2 text-paragraph-regular font-bold ${TEXT.heading}`}>Metal mix</h4>
            <ShareList
              rows={metals.map(([metal, enrolled]) => ({
                key: metal,
                label: metal,
                value: enrInt(enrolled),
                pct: enrPct(enrolled, market.total),
              }))}
            />
          </div>
        </div>
      )}
    </Panel>
  )
}

/** CMS historical premiums for the area, or a market snapshot where the Rate PUF has none. */
function AreaRatesPanel({ id }: { id: string }) {
  const { data, error } = useSwr<RatesResult>(`/api/rating-areas/${encodeURIComponent(id)}/rates`)
  const [year, setYear] = useState<number | null>(null)

  const state = id.slice(0, 2)
  const noRates = Boolean(error) || (data != null && data.years.length === 0)
  // Enrollment only when the Rate PUF has no premiums (state-based exchange); a null URL
  // skips the request for the FFM areas that do have rates.
  const market = useSwr<StateMarket>(
    noRates ? `/api/enrollment?state=${encodeURIComponent(state)}` : null,
  ).data

  if (!data && !error) return null // rates still loading
  // State-based-exchange areas aren't in the Rate PUF — show the state's market instead.
  if (error || !data || data.years.length === 0) return <StateMarketPanel state={state} market={market} />

  const latest = data.years[data.years.length - 1]
  const current = data.years.find((y) => y.year === year) ?? latest
  const csvUrl = `/api/rating-areas/${encodeURIComponent(id)}/rates?format=csv`
  // The 40-year-old is the conventional reference point; shown large when the PUF has it.
  const at40 = { cheapest: current.cheapestCents['40'], benchmark: current.benchmarkSilverCents['40'] }

  return (
    <Panel
      as="h3"
      flush
      title={`Premiums · plan year ${current.year}`}
      subtitle="Lowest-cost plan and the benchmark (2nd-lowest silver), non-tobacco sticker, by age."
      actions={
        <>
          <Select
            label="Year"
            value={current.year}
            onChange={(e) => setYear(Number(e.target.value))}
            width="w-28"
            className="h-9"
          >
            {[...data.years].reverse().map((y) => (
              <option key={y.year} value={y.year}>{y.year}</option>
            ))}
          </Select>
          <CopyJsonButton data={data} className="self-end" />
        </>
      }
    >
      {at40.cheapest != null && at40.benchmark != null && (
        <div className="px-4 pt-4 sm:px-6 sm:pt-5">
          <FigureStrip>
            <Figure label="Cheapest at 40" value={formatCents(at40.cheapest)} detail="per month" />
            <Figure label="Benchmark silver at 40" value={formatCents(at40.benchmark)} detail="per month" />
          </FigureStrip>
        </div>
      )}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-paragraph-small">
          <thead className={THEAD}>
            <tr>
              <th scope="col" className={cx(TH_DENSE, TD_STICKY, 'pl-4 sm:pl-6')}>Age</th>
              {data.referenceAges.map((age) => (
                <th key={age} scope="col" className={cx(TH_DENSE, 'text-right')}>{age}</th>
              ))}
            </tr>
          </thead>
          <tbody className={DIVIDED_LIST}>
            <RateRow label="Cheapest" ages={data.referenceAges} curve={current.cheapestCents} />
            <RateRow label="Benchmark silver" ages={data.referenceAges} curve={current.benchmarkSilverCents} />
          </tbody>
        </table>
      </div>
      <div className="px-4 py-4 sm:px-6">
        <ButtonLink href={csvUrl} download variant="text" className="-ml-3">
          <Download />
          Export all years (CSV)
        </ButtonLink>
      </div>
    </Panel>
  )
}

function RateRow({ label, ages, curve }: { label: string; ages: number[]; curve: Record<string, number> }) {
  return (
    <tr>
      <th scope="row" className={cx(TD_DENSE, TD_STICKY, `whitespace-nowrap pl-4 text-left font-bold sm:pl-6 ${TEXT.heading}`)}>
        {label}
      </th>
      {ages.map((age) => {
        const cents = curve[String(age)]
        return (
          <td key={age} className={cx(TD_DENSE, TD_NUM)}>
            {cents != null ? formatCents(cents) : <span className={TEXT.faint}>—</span>}
          </td>
        )
      })}
    </tr>
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
        'inline-flex rounded-xs p-1.5 transition-colors [&_svg]:size-4',
        TEXT.faint,
        HOVER.accent,
        FOCUS_RING,
        className,
      )}
    >
      {copied ? <Check /> : <Copy />}
    </button>
  )
}
