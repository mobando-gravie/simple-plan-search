'use client'
import { X } from 'lucide-react'
import {
  DEFAULT_FILTERS,
  filterOptions,
  type PlanFilterState,
  type SortKey,
} from '@/app/lib/planFilter'
import type { PricedPlan } from '@/app/lib/services/planSearch'
import { BTN_TEXT, CHECKBOX, FIELD, HINT, LABEL } from '@/app/ui/theme'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'premium', label: 'Premium' },
  { value: 'free-floor', label: 'Free floor' },
  { value: 'deductible', label: 'Deductible' },
  { value: 'oopMax', label: 'Max OOP' },
  { value: 'name', label: 'Plan name' },
]

/** Multi-select as toggle chips — a native multiple-select is unusable on touch. */
function ChipToggles({
  values,
  selected,
  onToggle,
  format = (v: string) => v,
}: {
  values: string[]
  selected: string[]
  onToggle: (value: string) => void
  format?: (v: string) => string
}) {
  if (values.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => {
        const on = selected.includes(value)
        return (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className={`rounded-xs border px-2 py-1 text-paragraph-extra-small font-bold capitalize transition-colors ${
              on
                ? 'border-marketplace-orange-50 bg-marketplace-orange-20 text-marketplace-orange-70'
                : 'border-brown-gravie-20 bg-white text-brown-gravie-50 hover:bg-marketplace-orange-10'
            }`}
          >
            {format(value)}
          </button>
        )
      })}
    </div>
  )
}

export default function PlanFilters({
  plans,
  filters,
  onChange,
  shown,
  allowanceCents,
  hasProviders,
  hasDrugs,
}: {
  plans: PricedPlan[]
  filters: PlanFilterState
  onChange: (next: PlanFilterState) => void
  shown: number
  allowanceCents: number
  hasProviders: boolean
  hasDrugs: boolean
}) {
  const options = filterOptions(plans)
  const set = <K extends keyof PlanFilterState>(key: K, value: PlanFilterState[K]) =>
    onChange({ ...filters, [key]: value })
  const toggle = (key: 'metalLevels' | 'planTypes' | 'carriers', value: string) =>
    set(
      key,
      filters[key].includes(value)
        ? filters[key].filter((v) => v !== value)
        : [...filters[key], value],
    )
  const dollarsToCents = (raw: string) => {
    const n = Number(raw)
    return raw.trim() === '' || !Number.isFinite(n) ? null : Math.round(n * 100)
  }
  const centsToDollars = (cents: number | null) => (cents === null ? '' : String(cents / 100))
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS)

  return (
    <div className="space-y-4 rounded-sm border border-brown-gravie-20 bg-brown-gravie-5 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className={LABEL}>Search</span>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="plan, carrier or HIOS id"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Max premium</span>
          <input
            inputMode="numeric"
            value={centsToDollars(filters.maxPremiumCents)}
            onChange={(e) => set('maxPremiumCents', dollarsToCents(e.target.value))}
            placeholder="800"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Max deductible</span>
          <input
            inputMode="numeric"
            value={centsToDollars(filters.maxDeductibleCents)}
            onChange={(e) => set('maxDeductibleCents', dollarsToCents(e.target.value))}
            placeholder="5000"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Sort by</span>
          <select
            value={filters.sort}
            onChange={(e) => set('sort', e.target.value as SortKey)}
            className={FIELD}
          >
            {SORTS.map((s) => (
              <option
                key={s.value}
                value={s.value}
                // Free floor ranks against the allowance; without one it has nothing to rank by.
                disabled={s.value === 'free-floor' && allowanceCents === 0}
              >
                {s.label}
                {s.value === 'free-floor' && allowanceCents === 0
                  ? ' — needs an allowance'
                  : ''}
              </option>
            ))}
          </select>
          {filters.sort === 'free-floor' && (
            <span className={HINT}>Best plan you can take at no cost, first.</span>
          )}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <span className={LABEL}>Metal</span>
          <ChipToggles
            values={options.metalLevels}
            selected={filters.metalLevels}
            onToggle={(v) => toggle('metalLevels', v)}
            format={(v) => v.replace('_', ' ')}
          />
        </div>
        <div>
          <span className={LABEL}>Plan type</span>
          <ChipToggles
            values={options.planTypes}
            selected={filters.planTypes}
            onToggle={(v) => toggle('planTypes', v)}
          />
        </div>
        <div>
          <span className={LABEL}>Carrier</span>
          <ChipToggles
            values={options.carriers}
            selected={filters.carriers}
            onToggle={(v) => toggle('carriers', v)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-brown-gravie-20 pt-3">
        <label className="flex items-center gap-2 text-paragraph-small text-ink-50">
          <input
            type="checkbox"
            checked={filters.hsaOnly}
            onChange={(e) => set('hsaOnly', e.target.checked)}
            className={CHECKBOX}
          />
          HSA eligible only
        </label>
        {hasDrugs && (
          <label className="flex items-center gap-2 text-paragraph-small text-ink-50">
            <input
              type="checkbox"
              checked={filters.coversAllDrugs}
              onChange={(e) => set('coversAllDrugs', e.target.checked)}
              className={CHECKBOX}
            />
            Covers all my drugs
          </label>
        )}
        {hasProviders && (
          <label className="flex items-center gap-2 text-paragraph-small text-ink-50">
            <input
              type="checkbox"
              checked={filters.allProvidersInNetwork}
              onChange={(e) => set('allProvidersInNetwork', e.target.checked)}
              className={CHECKBOX}
            />
            All my providers in network
          </label>
        )}
        <span className="ml-auto text-paragraph-small text-brown-gravie-50">
          showing <strong className="font-bold text-ink-60">{shown}</strong> of {plans.length}
        </span>
        {!isDefault && (
          <button type="button" onClick={() => onChange(DEFAULT_FILTERS)} className={BTN_TEXT}>
            <X />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
