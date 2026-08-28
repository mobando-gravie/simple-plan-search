'use client'
import { ChevronDown, ChevronUp, Plus, RotateCw, Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { refreshSearch } from '@/app/actions/search'
import { addUnique } from '@/app/lib/array'
import { drugKey } from '@/app/lib/ideon/coverage'
import { minutesAgo } from '@/app/lib/dates'
import { centsToDollarString, dollarsToCents, formatCents } from '@/app/lib/money'
import { plural } from '@/app/lib/text'
import { isZipCode } from '@/app/lib/validation'
import type { Household } from '@/app/lib/household'
import EntitySearch from '@/app/EntitySearch'
import type { DrugHit, ProviderHit, SelectedDrug, SelectedProvider } from '@/app/lib/ideon/types'
import type { PlanFilterState } from '@/app/lib/planFilter'
import {
  DEFAULT_CRITERIA,
  type SearchCriteria,
  type SearchResult,
} from '@/app/lib/services/planSearch'
import { encodeCriteria } from '@/app/lib/urlState'
import PlanResults from '@/app/PlanResults'
import { Button, IconButton } from '@/app/ui/Button'
import { BORDER, TEXT } from '@/app/ui/colors'
import { CheckboxRow, Field } from '@/app/ui/Field'
import { useAsyncAction } from '@/app/ui/useAsyncAction'
import { BANNER_ERROR, CARD, DIVIDED_TOP, MUTED, PANEL } from '@/app/ui/theme'

/** A runaway-click guard, not a domain rule. */
const MAX_CHILDREN = 10

/** One card per person. Identity comes from the field label, not a separate title. */
const PERSON_CARD = `${CARD} bg-brown-gravie-5 p-4`
const ADD_CARD = `flex flex-col items-start justify-center gap-2 rounded-sm border border-dashed ${BORDER.subtle} p-4`

type ChildRow = { id: number; age: string }

function num(form: FormData, name: string): number | undefined {
  const raw = String(form.get(name) ?? '').trim()
  if (raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

export default function SearchForm({
  criteria,
  filters,
  openPlanId,
  result,
  error,
}: {
  criteria: SearchCriteria | null
  filters: PlanFilterState
  openPlanId: string | null
  result: SearchResult | null
  error: string | null
}) {
  const router = useRouter()
  const searchAction = useAsyncAction()
  const refreshAction = useAsyncAction()
  // Either action in flight blocks both buttons; only the clicked one spins.
  const busy = searchAction.pending || refreshAction.pending
  const [refreshError, setRefreshError] = useState<string | null>(null)

  // Identity for the criteria the URL currently describes. The object reference
  // changes on every render; its encoded form only changes when the search does.
  const criteriaKey = criteria ? encodeCriteria(criteria).toString() : ''

  // Rows and chips cannot be expressed as form defaults, so they are state seeded
  // from the URL — the sanctioned adjust-state-on-new-prop pattern, since an effect
  // here would only add a second render.
  const [seededFrom, setSeededFrom] = useState<string | null>(null)
  const [spouse, setSpouse] = useState<{ age: string } | null>(null)
  const [children, setChildren] = useState<ChildRow[]>([])
  const [providers, setProviders] = useState<SelectedProvider[]>([])
  const [drugs, setDrugs] = useState<SelectedDrug[]>([])
  const [zip, setZip] = useState('')
  // Collapse once a search returns, so the results start at the top of the page.
  const [collapsed, setCollapsed] = useState(criteria !== null)

  if (criteriaKey !== seededFrom) {
    setSeededFrom(criteriaKey)
    const household: Household | undefined = criteria?.household
    setSpouse(household?.spouse ? { age: String(household.spouse.age) } : null)
    setChildren(
      (household?.children ?? []).map((child, i) => ({ id: i + 1, age: String(child.age) })),
    )
    setProviders(criteria?.providers ?? [])
    setDrugs(criteria?.drugs ?? [])
    setZip(criteria?.zipCode ?? '')
    setCollapsed(criteria !== null)
  }

  const summary = criteria
    ? [
        criteria.zipCode,
        `member ${criteria.household.member.age}`,
        criteria.household.spouse ? `spouse ${criteria.household.spouse.age}` : null,
        criteria.household.children.length > 0
          ? `${criteria.household.children.length} ${plural(criteria.household.children.length, 'child', 'children')}`
          : null,
        criteria.allowanceCents ? `${formatCents(criteria.allowanceCents)} allowance` : null,
        criteria.providers.length > 0 ? `${criteria.providers.length} providers` : null,
        criteria.drugs.length > 0 ? `${criteria.drugs.length} drugs` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  /** A new search drops the previous filters — its carriers may not exist in the new set. */
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const memberAge = num(form, 'memberAge')
    if (memberAge === undefined) return
    const spouseAge = num(form, 'spouseAge')
    const allowanceDollars = num(form, 'allowance')

    const next: SearchCriteria = {
      ...DEFAULT_CRITERIA,
      zipCode: String(form.get('zipCode') ?? '').trim(),
      household: {
        member: { age: memberAge, tobacco: form.get('memberTobacco') === 'on' },
        spouse:
          spouseAge === undefined
            ? null
            : { age: spouseAge, tobacco: form.get('spouseTobacco') === 'on' },
        children: form
          .getAll('childAge')
          .map((raw) => Number(String(raw)))
          .filter((age) => Number.isFinite(age))
          .map((age) => ({ age })),
      },
      householdIncome: num(form, 'householdIncome'),
      allowanceCents:
        allowanceDollars === undefined ? undefined : dollarsToCents(allowanceDollars),
      providers,
      drugs,
    }
    // Inside the transition, not beside it — a bare push reports no pending state.
    searchAction.run(() => router.push(`/?${encodeCriteria(next)}`))
  }

  /**
   * Everything the form holds is seeded from the URL's criteria, so navigating to a
   * bare `/` runs the existing reset — no second copy of it to keep in sync.
   */
  function clearAll() {
    searchAction.run(() => router.push('/'))
  }

  // The uncontrolled fields — income, allowance, age, tobacco — live in the DOM, so
  // this misses a user who typed only one of those and nothing else. `criteria`
  // covers every submitted case.
  const dirty =
    criteria !== null ||
    providers.length > 0 ||
    drugs.length > 0 ||
    spouse !== null ||
    children.length > 0 ||
    zip !== ''

  function refresh() {
    setRefreshError(null)
    refreshAction.run(async () => {
      const { error: failed } = await refreshSearch(window.location.search)
      if (failed) setRefreshError(failed)
      else router.refresh()
    })
  }

  const banner = error ?? refreshError

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className={`${PANEL} ${collapsed ? 'py-4' : 'space-y-6'}`}>
        {criteria && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            className="flex w-full items-center gap-2 text-left"
          >
            <span className={`text-header-h5 uppercase ${TEXT.muted}`}>Search</span>
            <span className={`min-w-0 flex-1 truncate text-paragraph-small ${TEXT.body}`}>
              {summary}
            </span>
            <span
              className={`flex shrink-0 items-center gap-1 text-paragraph-small font-bold ${TEXT.accent}`}
            >
              {collapsed ? 'Edit' : 'Hide'}
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </span>
          </button>
        )}

        {/* `hidden` rather than unmounting: the inputs must stay in the form or a
            collapsed submit would send an empty household. */}
        <div hidden={collapsed} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Keyed on the URL's criteria so a Back navigation re-seeds the field
              rather than leaving the previous typing in place. */}
          <Field
            key={`zip-${criteriaKey}`}
            label="ZIP code"
            name="zipCode"
            placeholder="11201"
            inputMode="numeric"
            pattern="\d{5}"
            title="Five digits"
            required
            defaultValue={criteria?.zipCode ?? ''}
            onChange={(e) => setZip(e.target.value)}
          />
          <Field
            key={`income-${criteriaKey}`}
            label="Household income"
            name="householdIncome"
            placeholder="80000"
            inputMode="numeric"
            hint="optional"
            defaultValue={criteria?.householdIncome ?? ''}
          />
          <Field
            key={`allowance-${criteriaKey}`}
            label="ICHRA allowance"
            name="allowance"
            placeholder="400"
            inputMode="numeric"
            hint="monthly, optional"
            defaultValue={centsToDollarString(criteria?.allowanceCents)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={PERSON_CARD}>
            <Field
              key={`member-${criteriaKey}`}
              label="Member age"
              name="memberAge"
              inputMode="numeric"
              required
              width="w-24"
              defaultValue={criteria?.household.member.age ?? 35}
            />
            <div className="mt-3">
              <CheckboxRow
                key={`member-tobacco-${criteriaKey}`}
                label="Uses tobacco"
                name="memberTobacco"
                defaultChecked={criteria?.household.member.tobacco ?? false}
              />
            </div>
          </div>

          {spouse && (
            <div className={PERSON_CARD}>
              <div className="flex items-start justify-between gap-2">
                <Field
                  label="Spouse age"
                  name="spouseAge"
                  inputMode="numeric"
                  required
                  width="w-24"
                  value={spouse.age}
                  onChange={(e) => setSpouse({ age: e.target.value })}
                />
                <IconButton label="Remove spouse" onClick={() => setSpouse(null)} className="-mr-1">
                  <X />
                </IconButton>
              </div>
              <div className="mt-3">
                <CheckboxRow
                  key={`spouse-tobacco-${criteriaKey}`}
                  label="Uses tobacco"
                  name="spouseTobacco"
                  defaultChecked={criteria?.household.spouse?.tobacco ?? false}
                />
              </div>
            </div>
          )}

          {children.map((child, i) => (
            <div key={child.id} className={PERSON_CARD}>
              <div className="flex items-start justify-between gap-2">
                <Field
                  label={`Child ${i + 1} age`}
                  name="childAge"
                  inputMode="numeric"
                  required
                  width="w-24"
                  value={child.age}
                  onChange={(e) =>
                    setChildren((rows) =>
                      rows.map((r) => (r.id === child.id ? { ...r, age: e.target.value } : r)),
                    )
                  }
                />
                <IconButton
                  label={`Remove child ${i + 1}`}
                  onClick={() => setChildren((rows) => rows.filter((r) => r.id !== child.id))}
                  className="-mr-1"
                >
                  <X />
                </IconButton>
              </div>
            </div>
          ))}

          <div className={ADD_CARD}>
            {!spouse && (
              <Button type="button" variant="text" onClick={() => setSpouse({ age: '' })}>
                <Plus />
                Add spouse
              </Button>
            )}
            {children.length < MAX_CHILDREN && (
              <Button
                type="button"
                variant="text"
                onClick={() =>
                  setChildren((rows) => [
                    ...rows,
                    { id: Math.max(0, ...rows.map((r) => r.id)) + 1, age: '' },
                  ])
                }
              >
                <Plus />
                Add child
              </Button>
            )}
            {dirty && (
              <Button
                type="button"
                variant="textDestructive"
                onClick={clearAll}
                disabled={busy}
              >
                <X />
                Clear all
              </Button>
            )}
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-4 pt-5 lg:grid-cols-2 ${DIVIDED_TOP}`}>
          <EntitySearch<ProviderHit, SelectedProvider>
            label="Providers"
            placeholder="Search doctors by name…"
            buildUrl={(term) =>
              isZipCode(zip) ? `/api/providers?zip=${zip}&q=${encodeURIComponent(term)}` : null
            }
            disabledReason="Enter a 5-digit ZIP code to search providers."
            keyOf={(hit) => String(hit.npi)}
            renderHit={(hit) => (
              <span className="block truncate">
                <span className={`font-bold ${TEXT.heading}`}>{hit.name}</span>
                <span className={TEXT.muted}>
                  {hit.specialty ? ` · ${hit.specialty}` : ''}
                  {hit.city ? ` · ${hit.city}` : ''}
                </span>
              </span>
            )}
            selected={providers.map((p) => ({ key: String(p.npi), label: p.name }))}
            onAdd={(hit) =>
              setProviders((rows) =>
                addUnique(rows, { npi: hit.npi, name: hit.name }, (r) => String(r.npi)),
              )
            }
            onRemove={(key) => setProviders((rows) => rows.filter((r) => String(r.npi) !== key))}
            onClearAll={() => setProviders([])}
            identifierKind="provider"
            identifierHint="Paste NPIs — 1629059456 | 1700805082, or comma separated"
            onPaste={(rows) =>
              setProviders((current) =>
                rows.reduce((acc, row) => addUnique(acc, row, (r) => String(r.npi)), current),
              )
            }
          />

          <EntitySearch<DrugHit, SelectedDrug>
            label="Prescriptions"
            placeholder="Search drugs by name…"
            buildUrl={(term) => `/api/drugs?q=${encodeURIComponent(term)}`}
            keyOf={(hit) => String(hit.medId)}
            renderHit={(hit) => <span className="block truncate">{hit.name}</span>}
            selected={drugs.map((d) => ({ key: drugKey(d), label: d.name }))}
            onAdd={(hit) => {
              const ndc = hit.packages[0]?.ndc
              if (!ndc) return
              setDrugs((rows) =>
                addUnique(rows, { medId: hit.medId, ndc, name: hit.name }, (r) => String(r.medId)),
              )
            }}
            onRemove={(key) => setDrugs((rows) => rows.filter((r) => drugKey(r) !== key))}
            onClearAll={() => setDrugs([])}
            identifierKind="drug"
            identifierHint="Paste RxCUIs — 748961 | 866083, or comma separated"
            onPaste={(rows) =>
              setDrugs((current) =>
                rows.reduce((acc, row) => addUnique(acc, row, drugKey), current),
              )
            }
          />
        </div>

        <div className={`flex justify-end gap-2 pt-5 ${DIVIDED_TOP}`}>
          <Button
            type="button"
            variant="outline"
            onClick={refresh}
            pending={refreshAction.pending}
            pendingLabel="Refreshing…"
            disabled={busy || !criteria}
          >
            <RotateCw />
            Refresh from Ideon
          </Button>
          <Button
            type="submit"
            pending={searchAction.pending}
            pendingLabel="Searching…"
            disabled={busy}
            className="px-6"
          >
            <Search />
            Search
          </Button>
          </div>
        </div>
      </form>

      {banner && <p className={BANNER_ERROR}>{banner}</p>}

      {result && criteria && (
        <div className="space-y-4">
          <div className={`flex flex-wrap gap-x-6 gap-y-1 ${MUTED}`}>
            <span>
              <strong className={`font-bold ${TEXT.heading}`}>{result.meta.total}</strong> plans in{' '}
              {result.meta.countyName ?? result.meta.fipsCode}, {result.meta.state}
            </span>
            <span>
              <strong className={`font-bold ${TEXT.heading}`}>{result.meta.modifiersApplied}</strong>{' '}
              of {result.plans.length} carry a Gravie modifier
            </span>
            {result.cache.hit && <span>cached {minutesAgo(result.cache.ageSeconds)} min ago</span>}
          </div>
          {/* Remounted per search so the filters re-seed from the URL rather than
              carrying over a selection the new result set may not contain. */}
          <PlanResults
            key={criteriaKey}
            plans={result.plans}
            filters={filters}
            openPlanId={openPlanId}
            allowanceCents={criteria.allowanceCents ?? 0}
            providers={criteria.providers}
            drugs={criteria.drugs}
          />
        </div>
      )}
    </div>
  )
}
