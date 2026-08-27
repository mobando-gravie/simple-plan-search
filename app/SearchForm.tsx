'use client'
import { useActionState, useRef } from 'react'
import { runSearch, type SearchState } from '@/app/actions/search'
import PlanTable from '@/app/PlanTable'

const FIELD =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400'
const LABEL = 'mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400'

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
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
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
      <form ref={formRef} action={action} className="space-y-5">
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
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <input type="checkbox" name="smoker" className="rounded border-zinc-300" />
            Primary applicant uses tobacco
          </label>
          <label className="flex items-center gap-2 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-300">
            Enrollment date
            <input type="date" name="enrollmentDate" className={`${FIELD} w-auto`} />
          </label>

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={pending}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Refresh from Ideon
            </button>
            <button
              type="submit"
              disabled={pending}
              onClick={() => refreshRef.current && (refreshRef.current.value = 'false')}
              className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {pending ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}

      {state?.plans && state.meta && state.cache && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-500">
            <span>
              <strong className="text-zinc-900 dark:text-zinc-100">{state.meta.total}</strong> plans
              in {state.meta.countyName ?? state.meta.fipsCode}, {state.meta.state}
            </span>
            <span>
              {state.meta.modifiersApplied} of {state.plans.length} carry a Gravie modifier
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
