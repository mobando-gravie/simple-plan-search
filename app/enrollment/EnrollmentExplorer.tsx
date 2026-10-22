'use client'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { useSwr } from '@/app/lib/swr/useSwr'
import { ButtonLink } from '@/app/ui/Button'
import { Chip, metalTone } from '@/app/ui/Chip'
import { TEXT } from '@/app/ui/colors'
import { cx } from '@/app/ui/cx'
import { Select } from '@/app/ui/Field'
import { Figure, FigureStrip } from '@/app/ui/Figure'
import { Panel } from '@/app/ui/Panel'
import { ShareList } from '@/app/ui/ShareList'
import { LoadingState } from '@/app/ui/Text'
import { DIVIDED_LIST, LINK, PANEL, TD_DENSE, TD_NUM, TH_DENSE, THEAD, TR } from '@/app/ui/theme'

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
const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)
/** CMS writes "Expanded Bronze"; the chip tones are keyed on Ideon's snake_case. */
const metalKey = (metal: string) => metal.toLowerCase().replace(/\s+/g, '_')

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
      <div className={`${PANEL} grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end`}>
        <Select
          label="State"
          value={state}
          onChange={(e) => choose(e.target.value, year)}
          width="w-full sm:w-72"
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
            label="Plan year"
            value={result?.year ?? ''}
            onChange={(e) => choose(state, Number(e.target.value))}
            width="w-full sm:w-32"
          >
            {[...years].reverse().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        )}
        {query && (
          <ButtonLink href={`${query}&format=csv`} download className="w-full sm:ml-auto sm:w-auto">
            <Download />
            Export CSV
          </ButtonLink>
        )}
      </div>

      {!state && !overview && <LoadingState>Loading states…</LoadingState>}

      {!state && overview && (
        <OverviewView overview={overview} onPick={(s) => choose(s, year)} />
      )}

      {state && pending && !result && <LoadingState>Loading {state}…</LoadingState>}
      {result && <StateView result={result} />}
    </div>
  )
}

/** The blank slate doubles as the national ranking — every state is one click away. */
function OverviewView({ overview, onPick }: { overview: Overview; onPick: (state: string) => void }) {
  const national = overview.states.reduce((sum, s) => sum + s.latestTotal, 0)
  const latestYear = overview.planYears.at(-1)
  return (
    <Panel
      title={`Largest markets · ${latestYear}`}
      subtitle={`${n(national)} average monthly enrollees nationwide. Pick a state for its metal mix, plans and issuers.`}
    >
      <ShareList
        ranked
        rows={overview.states.slice(0, 15).map((s) => ({
          key: s.state,
          label: (
            <button type="button" onClick={() => onPick(s.state)} className={LINK}>
              {s.stateName}
            </button>
          ),
          value: n(s.latestTotal),
          pct: pctOf(s.latestTotal, national),
        }))}
      />
    </Panel>
  )
}

function StateView({ result }: { result: StateResult }) {
  const metals = Object.entries(result.metalMix).sort((a, b) => b[1] - a[1])
  const topMetal = metals[0]
  const topIssuer = result.topIssuers[0]
  return (
    <div className="space-y-6">
      <Panel
        title={`${result.stateName} (${result.state}) · ${result.year}`}
        subtitle="Average monthly enrollment across the plan year."
      >
        <FigureStrip>
          <Figure label="Enrollees" value={n(result.total)} detail="average monthly" />
          {topMetal && (
            <Figure
              label="Top metal"
              value={topMetal[0]}
              detail={`${pctOf(topMetal[1], result.total)}% of enrollment`}
            />
          )}
          {topIssuer && (
            <Figure
              label="Top issuer"
              value={topIssuer.name}
              size="md"
              detail={`${pctOf(topIssuer.enrollment, result.total)}% of enrollment`}
              className="col-span-2 sm:max-w-xs"
            />
          )}
        </FigureStrip>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Panel as="h3" title="Metal mix" subtitle="Share of enrollees on each metal tier.">
          <ShareList
            rows={metals.map(([metal, enrolled]) => ({
              key: metal,
              label: metal,
              value: n(enrolled),
              pct: pctOf(enrolled, result.total),
            }))}
          />
        </Panel>

        <Panel as="h3" title="Top issuers" subtitle="By enrollment, with share of the state.">
          <ShareList
            ranked
            rows={result.topIssuers.map((issuer) => ({
              key: issuer.issuerId,
              label: issuer.name,
              value: n(issuer.enrollment),
              pct: pctOf(issuer.enrollment, result.total),
            }))}
          />
        </Panel>
      </div>

      <Panel as="h3" flush title="Most-chosen plans" subtitle="The plans people enrolled in most.">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={THEAD}>
              <tr>
                <th scope="col" className={cx(TH_DENSE, 'w-10 pl-4 text-right sm:pl-6')}>#</th>
                <th scope="col" className={TH_DENSE}>Plan</th>
                <th scope="col" className={cx(TH_DENSE, 'hidden sm:table-cell')}>Metal</th>
                <th scope="col" className={cx(TH_DENSE, 'pr-4 text-right sm:pr-6')}>Enrollment</th>
              </tr>
            </thead>
            <tbody className={DIVIDED_LIST}>
              {result.topPlans.map((p, i) => (
                <tr key={p.planId} className={cx(TR, 'align-top')}>
                  <td className={cx(TD_DENSE, TD_NUM, 'pl-4 sm:pl-6', TEXT.faint)}>{i + 1}</td>
                  <td className={cx(TD_DENSE, 'min-w-0')}>
                    <span className={cx('block', TEXT.heading)}>{p.name}</span>
                    <span className={cx('block text-paragraph-extra-small', TEXT.muted)}>
                      {p.issuer} · <span className="font-mono">{p.planId}</span>
                    </span>
                    {/* The metal column folds into the name cell on phones. */}
                    <Chip tone={metalTone(metalKey(p.metal))} className="mt-1 sm:hidden">
                      {p.metal}
                    </Chip>
                  </td>
                  <td className={cx(TD_DENSE, 'hidden sm:table-cell')}>
                    <Chip tone={metalTone(metalKey(p.metal))}>{p.metal}</Chip>
                  </td>
                  <td className={cx(TD_DENSE, TD_NUM, 'pr-4 font-bold sm:pr-6', TEXT.heading)}>
                    {n(p.enrollment)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
