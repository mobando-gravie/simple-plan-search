'use client'
import { ChevronDown, ChevronUp, Plus, RotateCw, Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { refreshSearch } from '@/app/actions/search'
import { formatCents } from '@/app/lib/money'
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
import {
  BANNER_ERROR,
  BTN_OUTLINE,
  BTN_SOLID,
  BTN_TEXT,
  CHECKBOX,
  FIELD,
  HINT,
  LABEL,
  PANEL,
} from '@/app/ui/theme'

/** A runaway-click guard, not a domain rule. */
const MAX_CHILDREN = 10

/** One card per person. Identity comes from the field label, not a separate title. */
const PERSON_CARD =
  'rounded-sm bg-brown-gravie-5 p-4 shadow-elevation-1'
const ADD_CARD =
  'flex flex-col items-start justify-center gap-2 rounded-sm border border-dashed border-brown-gravie-20 p-4'
// FIELD is w-full; appending w-24 loses to it, so swap the class out.
const AGE_FIELD = FIELD.replace('w-full', 'w-24')

function Field({
  label,
  name,
  hint,
  ...input
}: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <input name={name} className={FIELD} {...input} />
      {hint && <span className={HINT}>{hint}</span>}
    </label>
  )
}

function TobaccoCheckbox({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-paragraph-small text-ink-50">
      <input type="checkbox" name={name} className={CHECKBOX} defaultChecked={defaultChecked} />
      Uses tobacco
    </label>
  )
}

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
  const [pending, startTransition] = useTransition()
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
          ? `${criteria.household.children.length} ${criteria.household.children.length === 1 ? 'child' : 'children'}`
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
        allowanceDollars === undefined ? undefined : Math.round(allowanceDollars * 100),
      providers,
      drugs,
    }
    router.push(`/?${encodeCriteria(next)}`)
  }

  function refresh() {
    setRefreshError(null)
    startTransition(async () => {
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
            <span className="text-header-h5 uppercase text-brown-gravie-50">Search</span>
            <span className="min-w-0 flex-1 truncate text-paragraph-small text-ink-50">
              {summary}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-paragraph-small font-bold text-marketplace-orange-60">
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
            defaultValue={
              criteria?.allowanceCents === undefined ? '' : criteria.allowanceCents / 100
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={PERSON_CARD}>
            <label className="block">
              <span className={LABEL}>Member age</span>
              <input
                key={`member-${criteriaKey}`}
                name="memberAge"
                inputMode="numeric"
                required
                className={AGE_FIELD}
                defaultValue={criteria?.household.member.age ?? 35}
              />
            </label>
            <div className="mt-3">
              <TobaccoCheckbox
                key={`member-tobacco-${criteriaKey}`}
                name="memberTobacco"
                defaultChecked={criteria?.household.member.tobacco ?? false}
              />
            </div>
          </div>

          {spouse && (
            <div className={PERSON_CARD}>
              <div className="flex items-start justify-between gap-2">
                <label className="block">
                  <span className={LABEL}>Spouse age</span>
                  <input
                    name="spouseAge"
                    inputMode="numeric"
                    required
                    className={AGE_FIELD}
                    value={spouse.age}
                    onChange={(e) => setSpouse({ age: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setSpouse(null)}
                  className="-mr-1 rounded-xs p-1 text-brown-gravie-30 transition-colors hover:text-destructive"
                  aria-label="Remove spouse"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3">
                <TobaccoCheckbox
                  key={`spouse-tobacco-${criteriaKey}`}
                  name="spouseTobacco"
                  defaultChecked={criteria?.household.spouse?.tobacco ?? false}
                />
              </div>
            </div>
          )}

          {children.map((child, i) => (
            <div key={child.id} className={PERSON_CARD}>
              <div className="flex items-start justify-between gap-2">
                <label className="block">
                  <span className={LABEL}>Child {i + 1} age</span>
                  <input
                    name="childAge"
                    inputMode="numeric"
                    required
                    className={AGE_FIELD}
                    value={child.age}
                    onChange={(e) =>
                      setChildren((rows) =>
                        rows.map((r) => (r.id === child.id ? { ...r, age: e.target.value } : r)),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setChildren((rows) => rows.filter((r) => r.id !== child.id))}
                  className="-mr-1 rounded-xs p-1 text-brown-gravie-30 transition-colors hover:text-destructive"
                  aria-label={`Remove child ${i + 1}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className={ADD_CARD}>
            {!spouse && (
              <button type="button" onClick={() => setSpouse({ age: '' })} className={BTN_TEXT}>
                <Plus />
                Add spouse
              </button>
            )}
            {children.length < MAX_CHILDREN && (
              <button
                type="button"
                onClick={() =>
                  setChildren((rows) => [
                    ...rows,
                    { id: Math.max(0, ...rows.map((r) => r.id)) + 1, age: '' },
                  ])
                }
                className={BTN_TEXT}
              >
                <Plus />
                Add child
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-brown-gravie-20 pt-5 lg:grid-cols-2">
          <EntitySearch<ProviderHit>
            label="Providers"
            placeholder="Search doctors by name…"
            buildUrl={(term) =>
              /^\d{5}$/.test(zip)
                ? `/api/providers?zip=${zip}&q=${encodeURIComponent(term)}`
                : null
            }
            disabledReason="Enter a 5-digit ZIP code to search providers."
            keyOf={(hit) => String(hit.npi)}
            renderHit={(hit) => (
              <span className="block truncate">
                <span className="font-bold text-ink-60">{hit.name}</span>
                <span className="text-brown-gravie-50">
                  {hit.specialty ? ` · ${hit.specialty}` : ''}
                  {hit.city ? ` · ${hit.city}` : ''}
                </span>
              </span>
            )}
            selected={providers.map((p) => ({ key: String(p.npi), label: p.name }))}
            onAdd={(hit) =>
              setProviders((rows) =>
                rows.some((r) => r.npi === hit.npi)
                  ? rows
                  : [...rows, { npi: hit.npi, name: hit.name }],
              )
            }
            onRemove={(key) => setProviders((rows) => rows.filter((r) => String(r.npi) !== key))}
          />

          <EntitySearch<DrugHit>
            label="Prescriptions"
            placeholder="Search drugs by name…"
            buildUrl={(term) => `/api/drugs?q=${encodeURIComponent(term)}`}
            keyOf={(hit) => String(hit.medId)}
            renderHit={(hit) => <span className="block truncate">{hit.name}</span>}
            selected={drugs.map((d) => ({ key: String(d.medId), label: d.name }))}
            onAdd={(hit) => {
              const ndc = hit.packages[0]?.ndc
              if (!ndc) return
              setDrugs((rows) =>
                rows.some((r) => r.medId === hit.medId)
                  ? rows
                  : [...rows, { medId: hit.medId, ndc, name: hit.name }],
              )
            }}
            onRemove={(key) => setDrugs((rows) => rows.filter((r) => String(r.medId) !== key))}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-brown-gravie-20 pt-5">
          <button
            type="button"
            onClick={refresh}
            disabled={pending || !criteria}
            className={BTN_OUTLINE}
          >
            <RotateCw />
            Refresh from Ideon
          </button>
          <button type="submit" disabled={pending} className={`${BTN_SOLID} px-6`}>
            <Search />
            {pending ? 'Searching…' : 'Search'}
          </button>
          </div>
        </div>
      </form>

      {banner && <p className={BANNER_ERROR}>{banner}</p>}

      {result && criteria && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-paragraph-small text-brown-gravie-50">
            <span>
              <strong className="font-bold text-ink-60">{result.meta.total}</strong> plans in{' '}
              {result.meta.countyName ?? result.meta.fipsCode}, {result.meta.state}
            </span>
            <span>
              <strong className="font-bold text-ink-60">{result.meta.modifiersApplied}</strong> of{' '}
              {result.plans.length} carry a Gravie modifier
            </span>
            <span>
              {result.cache.hit
                ? `cached ${Math.round(result.cache.ageSeconds / 60)} min ago`
                : 'fetched live from Ideon'}
            </span>
          </div>
          {/* Remounted per search so the filters re-seed from the URL rather than
              carrying over a selection the new result set may not contain. */}
          <PlanResults
            key={criteriaKey}
            plans={result.plans}
            filters={filters}
            openPlanId={openPlanId}
            allowanceCents={criteria.allowanceCents ?? 0}
            drugs={criteria.drugs}
          />
        </div>
      )}
    </div>
  )
}
