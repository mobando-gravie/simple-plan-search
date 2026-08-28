'use client'
import { useMemo, useState } from 'react'
import { applyPlanFilters, DEFAULT_FILTERS, type PlanFilterState } from '@/app/lib/planFilter'
import type { PricedPlan } from '@/app/lib/services/planSearch'
import PlanFilters from '@/app/PlanFilters'
import PlanList from '@/app/PlanList'

export default function PlanResults({
  plans,
  householdSize,
}: {
  plans: PricedPlan[]
  householdSize: number
}) {
  const [filters, setFilters] = useState<PlanFilterState>(DEFAULT_FILTERS)
  const visible = useMemo(() => applyPlanFilters(plans, filters), [plans, filters])

  const hasProviders = plans.some((p) => p.coverage.providers.length > 0)
  const hasDrugs = plans.some((p) => p.coverage.drugs.length > 0)

  return (
    <div className="space-y-4">
      <PlanFilters
        plans={plans}
        filters={filters}
        onChange={setFilters}
        shown={visible.length}
        hasProviders={hasProviders}
        hasDrugs={hasDrugs}
      />
      <PlanList plans={visible} householdSize={householdSize} />
    </div>
  )
}
