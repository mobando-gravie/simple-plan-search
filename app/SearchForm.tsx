'use client'
import { RotateCw, Search } from 'lucide-react'
import { useActionState, useRef } from 'react'
import { runSearch, type SearchState } from '@/app/actions/search'
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

export default function SearchForm() {
  const [state, action, pending] = useActionState<SearchState, FormData>(runSearch, {})
  const formRef = useRef<HTMLFormElement>(null)
  const refreshRef = useRef<HTMLInputElement>(null)

  function refresh() {
    if (!refreshRef.current || !formRef.current) return
    refreshRef.current.value = 'true'
    formRef.current.requestSubmit()
  }

  return (
    <div className="space-y-8">
      <form ref={formRef} action={action} className={`${PANEL} space-y-5`}>
        <input ref={refreshRef} type="hidden" name="refresh" value="false" />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="ZIP code" name="zipCode" placeholder="11201" inputMode="numeric" required />
          <Field label="Adult ages" name="adultAges" placeholder="35" defaultValue="35" hint="comma separated" />
          <Field label="Child ages" name="childAges" placeholder="4,7" hint="optional" />
          <Field label="Household income" name="householdIncome" placeholder="80000" inputMode="numeric" />
          <Field label="Household size" name="householdSize" placeholder="4" inputMode="numeric" />
          <Field label="Plans per page" name="perPage" defaultValue="50" inputMode="numeric" />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-paragraph-small text-ink-50">
            <input type="checkbox" name="smoker" className={CHECKBOX} />
            Primary applicant uses tobacco
          </label>
          <label className="flex items-center gap-2 whitespace-nowrap text-paragraph-small text-ink-50">
            Enrollment date
            <input type="date" name="enrollmentDate" className={`${FIELD} w-auto`} />
          </label>

          <div className="ml-auto flex gap-2">
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
        </div>
      </form>

      {state?.error && <p className={BANNER_ERROR}>{state.error}</p>}

      {state?.plans && state.meta && state.cache && (
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
          <PlanTable plans={state.plans} householdSize={state.meta.householdSize} />
        </div>
      )}
    </div>
  )
}
