'use client'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useMemo, useState } from 'react'
import { applyPlanFilters, DEFAULT_FILTERS, type PlanFilterState } from '@/app/lib/planFilter'
import type { SelectedDrug } from '@/app/lib/ideon/types'
import type { PricedPlan } from '@/app/lib/services/planSearch'
import PlanFilters from '@/app/PlanFilters'
import PlanList from '@/app/PlanList'

export default function PlanResults({
  plans,
  allowanceCents = 0,
  drugs = [],
}: {
  plans: PricedPlan[]
  allowanceCents?: number
  drugs?: SelectedDrug[]
}) {
  const [filters, setFilters] = useState<PlanFilterState>(DEFAULT_FILTERS)
  const visible = useMemo(
    () => applyPlanFilters(plans, filters, allowanceCents),
    [plans, filters, allowanceCents],
  )

  const hasProviders = plans.some((p) => p.coverage.providers.length > 0)
  const hasDrugs = plans.some((p) => p.coverage.drugs.length > 0)

  // One provider for the whole result set: delayDuration and skipDelayDuration are
  // provider-level, so this is what makes timing consistent and lets a reader move
  // between neighbouring tooltips without waiting again.
  return (
    <Tooltip.Provider delayDuration={200} skipDelayDuration={300}>
      <div className="space-y-4">
      <PlanFilters
        plans={plans}
        filters={filters}
        onChange={setFilters}
        shown={visible.length}
        allowanceCents={allowanceCents}
        hasProviders={hasProviders}
        hasDrugs={hasDrugs}
      />
        <PlanList plans={visible} allowanceCents={allowanceCents} drugs={drugs} />
      </div>
    </Tooltip.Provider>
  )
}
