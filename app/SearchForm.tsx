'use client'
import { Plus, RotateCw, Search, X } from 'lucide-react'
import { useActionState, useRef, useState } from 'react'
import { runSearch, type SearchState } from '@/app/actions/search'
import type { Household } from '@/app/lib/household'
import PlanTable from '@/app/PlanTable'
import {
  BANNER_ERROR,
  BTN_OUTLINE,
  BTN_SOLID,
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
  'rounded-sm border border-brown-gravie-20 bg-brown-gravie-5 p-4 shadow-elevation-1'
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

/**
 * Uncontrolled on purpose. React resets the form once the action resolves, which
 * restores a checkbox from its defaultChecked attribute — and does not afterwards
 * re-sync a controlled `checked`, so a controlled box appears to clear itself.
 */
function TobaccoCheckbox({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-paragraph-small text-ink-50">
      <input type="checkbox" name={name} className={CHECKBOX} defaultChecked={defaultChecked} />
      Uses tobacco
    </label>
  )
}

type ChildRow = { id: number; age: string }

export default function SearchForm() {
  const [state, action, pending] = useActionState<SearchState, FormData>(runSearch, {})
  const formRef = useRef<HTMLFormElement>(null)
  const refreshRef = useRef<HTMLInputElement>(null)

  // React resets a form once its action resolves, restoring every field to its
  // defaultValue — so the defaults have to echo what was just submitted, or the
  // criteria vanish and Refresh can no longer resubmit them.
  const submitted = state?.criteria
  const household = submitted?.household

  // Spouse and children are rows, not just values, so the post-action reset cannot
  // restore them. Holding them as controlled state sidesteps the reset entirely and
  // lets a returned household re-seed them (the sanctioned adjust-state-on-new-prop
  // pattern — an effect here would only cause a second render).
  const [spouse, setSpouse] = useState<{ age: string } | null>(null)
  const [children, setChildren] = useState<ChildRow[]>([])
  const [seededFrom, setSeededFrom] = useState<Household | null>(null)

  if (household && household !== seededFrom) {
    setSeededFrom(household)
    setSpouse(household.spouse ? { age: String(household.spouse.age) } : null)
    setChildren(household.children.map((child, i) => ({ id: i + 1, age: String(child.age) })))
  }

  function refresh() {
    if (!refreshRef.current || !formRef.current) return
    refreshRef.current.value = 'true'
    formRef.current.requestSubmit()
  }

  return (
    <div className="space-y-8">
      <form ref={formRef} action={action} className={`${PANEL} space-y-6`}>
        <input ref={refreshRef} type="hidden" name="refresh" value="false" />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Field
            label="ZIP code"
            name="zipCode"
            placeholder="11201"
            inputMode="numeric"
            required
            defaultValue={submitted?.zipCode ?? ''}
          />
          <Field
            label="Household income"
            name="householdIncome"
            placeholder="80000"
            inputMode="numeric"
            hint="optional"
            defaultValue={submitted?.householdIncome ?? ''}
          />
          <label className="block">
            <span className={LABEL}>Enrollment date</span>
            <input
              type="date"
              name="enrollmentDate"
              className={FIELD}
              defaultValue={submitted?.enrollmentDate ?? ''}
            />
          </label>
          <Field
            label="Plans per page"
            name="perPage"
            inputMode="numeric"
            defaultValue={submitted?.perPage ?? 50}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!spouse && (
            <button type="button" onClick={() => setSpouse({ age: '' })} className={BTN_OUTLINE}>
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
              className={BTN_OUTLINE}
            >
              <Plus />
              Add child
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={PERSON_CARD}>
            <label className="block">
              <span className={LABEL}>Member age</span>
              <input
                name="memberAge"
                inputMode="numeric"
                required
                className={AGE_FIELD}
                defaultValue={household?.member.age ?? 35}
              />
            </label>
            <div className="mt-3">
              <TobaccoCheckbox
                name="memberTobacco"
                defaultChecked={household?.member.tobacco ?? false}
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
                  name="spouseTobacco"
                  defaultChecked={household?.spouse?.tobacco ?? false}
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
        </div>

        <div className="flex justify-end gap-2 border-t border-brown-gravie-20 pt-5">
          <button type="button" onClick={refresh} disabled={pending} className={BTN_OUTLINE}>
            <RotateCw />
            Refresh from Ideon
          </button>
          <button
            type="submit"
            disabled={pending}
            onClick={() => refreshRef.current && (refreshRef.current.value = 'false')}
            className={`${BTN_SOLID} px-6`}
          >
            <Search />
            {pending ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {state?.error && <p className={BANNER_ERROR}>{state.error}</p>}

      {state?.plans && state.meta && state.cache && submitted && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-paragraph-small text-brown-gravie-50">
            <span>
              <strong className="font-bold text-ink-60">{state.meta.total}</strong> plans in{' '}
              {state.meta.countyName ?? state.meta.fipsCode}, {state.meta.state}
            </span>
            <span>
              <strong className="font-bold text-ink-60">{state.meta.modifiersApplied}</strong> of{' '}
              {state.plans.length} carry a Gravie modifier
            </span>
            <span>
              {state.cache.hit
                ? `cached ${Math.round(state.cache.ageSeconds / 60)} min ago`
                : 'fetched live from Ideon'}
            </span>
          </div>
          <PlanTable
            plans={state.plans}
            household={submitted.household}
          />
        </div>
      )}
    </div>
  )
}
