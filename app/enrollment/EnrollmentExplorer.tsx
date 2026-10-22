'use client'
import { useState } from 'react'
import { useSwr } from '@/app/lib/swr/useSwr'
import { Select } from '@/app/ui/Field'
import { Muted } from '@/app/ui/Text'
import { PANEL } from '@/app/ui/theme'

type OverviewState = { state: string; stateName: string; latestYear: number; latestTotal: number }
type Overview = { planYears: number[]; measure: string; source: string; states: OverviewState[] }
type Plan = { planId: string; name: string; issuer: string; metal: string; enrollment: number }
type Issuer = { issuerId: string; name: string; enrollment: number }
type StateResult = {
  state: string
  stateName: string
  year: number
  total: number
  metalMix: Record<string, number>
  topPlans: Plan[]
  topIssuers: Issuer[]
}

const n = (v: number) => v.toLocaleString('en-US')

export default function EnrollmentExplorer({
  initialState,
  initialYear,
}: {
  initialState?: string
  initialYear?: number
}) {
  const [state, setState] = useState(initialState ?? '')
  const [year, setYear] = useState<number | null>(initialYear ?? null)

  const overview = useSwr<Overview>('/api/enrollment').data
  const query = state
    ? `/api/enrollment?state=${encodeURIComponent(state)}${year ? `&year=${year}` : ''}`
    : null
  const { data: result, pending } = useSwr<StateResult>(query)

  function choose(nextState: string, nextYear: number | null) {
    setState(nextState)
    setYear(nextYear)
    if (typeof window !== 'undefined') {
      const q = nextState ? `?state=${encodeURIComponent(nextState)}${nextYear ? `&year=${nextYear}` : ''}` : ''
      window.history.replaceState(null, '', q || window.location.pathname)
    }
  }

  const years = overview?.planYears ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="State"
          value={state}
          onChange={(e) => choose(e.target.value, year)}
          className="w-64"
        >
          <option value="">Choose a state…</option>
          {(overview?.states ?? []).map((s) => (
            <option key={s.state} value={s.state}>
              {s.stateName} ({s.state}) · {n(s.latestTotal)}
            </option>
          ))}
        </Select>
        {state && years.length > 0 && (
          <Select
            label="Year"
            value={result?.year ?? ''}
            onChange={(e) => choose(state, Number(e.target.value))}
            className="w-28"
          >
            {[...years].reverse().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        )}
        {query && (
          <a
            href={`${query}&format=csv`}
            download
            className="ml-auto self-center text-paragraph-small text-brand-60 underline"
          >
            Export CSV
          </a>
        )}
      </div>

      {!state && overview && (
        <div className={PANEL}>
          <h2 className="text-header-h4 font-black">Largest markets · {overview.planYears.at(-1)}</h2>
          <ol className="mt-4 space-y-1">
            {overview.states.slice(0, 15).map((s, i) => (
              <li key={s.state} className="flex justify-between gap-3 text-paragraph-small tnum">
                <span className="min-w-0">
                  <span className="text-ink-30">{i + 1}.</span> {s.stateName}
                </span>
                <span className="shrink-0 font-bold">{n(s.latestTotal)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {state && pending && !result && <Muted>Loading {state}…</Muted>}
      {result && <StateView result={result} />}
    </div>
  )
}

function StateView({ result }: { result: StateResult }) {
  const metals = Object.entries(result.metalMix).sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-6">
      <div className={PANEL}>
        <h2 className="text-header-h4 font-black">
          {result.stateName} ({result.state}) · {result.year}
        </h2>
        <Muted className="mt-1">{n(result.total)} average monthly enrollees</Muted>

        <h3 className="mt-5 text-paragraph-regular font-bold">Metal mix</h3>
        <ul className="mt-2 space-y-1">
          {metals.map(([metal, count]) => {
            const pct = result.total > 0 ? Math.round((count / result.total) * 100) : 0
            return (
              <li key={metal} className="text-paragraph-small">
                <div className="flex justify-between tnum">
                  <span>{metal}</span>
                  <span className="text-ink-30">{n(count)} · {pct}%</span>
                </div>
                <div className="mt-0.5 h-1.5 rounded-full bg-ink-10">
                  <div className="h-1.5 rounded-full bg-brand-60" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className={PANEL}>
        <h3 className="text-paragraph-regular font-bold">Most-chosen plans</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-paragraph-small tnum">
            <thead>
              <tr className="text-left text-ink-30">
                <th className="py-1 pr-3 font-normal">#</th>
                <th className="py-1 pr-3 font-normal">Plan</th>
                <th className="py-1 pr-3 font-normal">Metal</th>
                <th className="py-1 pr-3 text-right font-normal">Enrollment</th>
              </tr>
            </thead>
            <tbody>
              {result.topPlans.map((p, i) => (
                <tr key={p.planId} className="border-t border-ink-10 align-top">
                  <td className="py-2 pr-3 text-ink-30">{i + 1}</td>
                  <td className="py-2 pr-3">
                    {p.name}
                    <span className="block text-ink-30">{p.issuer}</span>
                  </td>
                  <td className="py-2 pr-3">{p.metal}</td>
                  <td className="py-2 pr-3 text-right font-bold">{n(p.enrollment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={PANEL}>
        <h3 className="text-paragraph-regular font-bold">Top issuers</h3>
        <ul className="mt-3 space-y-1">
          {result.topIssuers.map((is, i) => (
            <li key={is.issuerId} className="flex justify-between gap-3 text-paragraph-small tnum">
              <span className="min-w-0">
                <span className="text-ink-30">{i + 1}.</span> {is.name}
              </span>
              <span className="shrink-0 font-bold">{n(is.enrollment)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
