'use client'
import { X } from 'lucide-react'
import { toggle } from '@/app/lib/array'
import { centsToDollarString, parseDollarStringToCents } from '@/app/lib/money'
import { DEFAULT_FILTERS, filterOptions, type PlanFilterState, type SortKey } from '@/app/lib/planFilter'
import { isDefaultFilters } from '@/app/lib/urlState'
import type { PricedPlan } from '@/app/lib/services/planSearch'
import { Button } from '@/app/ui/Button'
import { ToggleChip, TriStateChip } from '@/app/ui/Chip'
import { TEXT } from '@/app/ui/colors'
import { Field, Select } from '@/app/ui/Field'
import { CARD, DIVIDED_TOP, LABEL, MUTED } from '@/app/ui/theme'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'premium-asc', label: 'Premium, low to high' },
  { value: 'premium-desc', label: 'Premium, high to low' },
  { value: 'deductible-asc', label: 'Deductible, low to high' },
  { value: 'deductible-desc', label: 'Deductible, high to low' },
  { value: 'oopMax-asc', label: 'Max OOP, low to high' },
  { value: 'oopMax-desc', label: 'Max OOP, high to low' },
  { value: 'name', label: 'Plan name' },
  { value: 'free-floor', label: 'Free floor' },
]

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
      {values.map((value) => (
        <ToggleChip
          key={value}
          on={selected.includes(value)}
          onClick={() => onToggle(value)}
          className="capitalize"
        >
          {format(value)}
        </ToggleChip>
      ))}
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
  const toggleValue = (key: 'metalLevels' | 'planTypes' | 'carriers', value: string) =>
    set(key, toggle(filters[key], value))
  const isDefault = isDefaultFilters(filters)

  return (
    <div className={`space-y-4 p-4 ${CARD}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Search"
          type="search"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="plan, carrier or HIOS id"
        />
        <Field
          label="Max premium"
          inputMode="numeric"
          value={centsToDollarString(filters.maxPremiumCents)}
          onChange={(e) => set('maxPremiumCents', parseDollarStringToCents(e.target.value))}
          placeholder="800"
        />
        <Field
          label="Max deductible"
          inputMode="numeric"
          value={centsToDollarString(filters.maxDeductibleCents)}
          onChange={(e) => set('maxDeductibleCents', parseDollarStringToCents(e.target.value))}
          placeholder="5000"
        />
        <Select
          label="Sort by"
          value={filters.sort}
          onChange={(e) => set('sort', e.target.value as SortKey)}
          hint={filters.sort === 'free-floor' ? 'Best plan you can take at no cost, first.' : undefined}
        >
          {SORTS.map((s) => (
            <option
              key={s.value}
              value={s.value}
              // Free floor ranks against the allowance; without one it has nothing to rank by.
              disabled={s.value === 'free-floor' && allowanceCents === 0}
            >
              {s.label}
              {s.value === 'free-floor' && allowanceCents === 0 ? ' — needs an allowance' : ''}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <span className={LABEL}>Metal</span>
          <ChipToggles
            values={options.metalLevels}
            selected={filters.metalLevels}
            onToggle={(v) => toggleValue('metalLevels', v)}
            format={(v) => v.replace('_', ' ')}
          />
        </div>
        <div>
          <span className={LABEL}>Network type</span>
          <ChipToggles
            values={options.planTypes}
            selected={filters.planTypes}
            onToggle={(v) => toggleValue('planTypes', v)}
          />
        </div>
        <div>
          <span className={LABEL}>Carrier</span>
          <ChipToggles
            values={options.carriers}
            selected={filters.carriers}
            onToggle={(v) => toggleValue('carriers', v)}
          />
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-4 pt-3 ${DIVIDED_TOP}`}>
        <ToggleChip on={filters.hsaOnly} onClick={() => set('hsaOnly', !filters.hsaOnly)}>
          HSA eligible only
        </ToggleChip>
        {hasDrugs && (
          <TriStateChip
            value={filters.drugCoverage}
            onChange={(next) => set('drugCoverage', next)}
          >
            Covers my drugs
          </TriStateChip>
        )}
        {hasProviders && (
          <TriStateChip
            value={filters.providerCoverage}
            onChange={(next) => set('providerCoverage', next)}
          >
            My providers in network
          </TriStateChip>
        )}
        <span className={`ml-auto ${MUTED}`}>
          showing <strong className={`font-bold ${TEXT.heading}`}>{shown}</strong> of {plans.length}
        </span>
        {!isDefault && (
          <Button type="button" variant="text" onClick={() => onChange(DEFAULT_FILTERS)}>
            <X />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
