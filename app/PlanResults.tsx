'use client'
import { useMemo, useState } from 'react'
import { applyPlanFilters, type PlanFilterState } from '@/app/lib/planFilter'
import type { SelectedDrug } from '@/app/lib/ideon/types'
import type { PricedPlan } from '@/app/lib/services/planSearch'
import { encodeView } from '@/app/lib/urlState'
import PlanFilters from '@/app/PlanFilters'
import PlanList from '@/app/PlanList'
import { TooltipProvider } from '@/app/ui/InfoTooltip'

/**
 * The URL seeds this component and receives every change back, but the live copy
 * is React state: `history.replaceState` updates the address bar without telling
 * React anything. Remounted per search via a key, so the props seed it again.
 */
export default function PlanResults({
  plans,
  filters: initialFilters,
  openPlanId: initialOpenPlanId,
  allowanceCents = 0,
  drugs = [],
}: {
  plans: PricedPlan[]
  filters: PlanFilterState
  openPlanId: string | null
  allowanceCents?: number
  drugs?: SelectedDrug[]
}) {
  const [filters, setFilters] = useState(initialFilters)
  const [openPlanId, setOpenPlanId] = useState(initialOpenPlanId)

  const visible = useMemo(
    () => applyPlanFilters(plans, filters, allowanceCents),
    [plans, filters, allowanceCents],
  )

  const hasProviders = plans.some((p) => p.coverage.providers.length > 0)
  const hasDrugs = plans.some((p) => p.coverage.drugs.length > 0)

  /**
   * Filtering and opening a plan are client-side derivations over plans already in
   * memory, so they go through history rather than the router — `router.replace`
   * would re-run the server component on every chip toggle and every keystroke.
   */
  function update(nextFilters: PlanFilterState, nextOpenPlanId: string | null) {
    setFilters(nextFilters)
    setOpenPlanId(nextOpenPlanId)
    const query = encodeView(
      new URLSearchParams(window.location.search),
      nextFilters,
      nextOpenPlanId,
    ).toString()
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
  }

  // One provider for the whole result set: delayDuration and skipDelayDuration are
  // provider-level, so this is what makes timing consistent and lets a reader move
  // between neighbouring tooltips without waiting again.
  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={300}>
      <div className="space-y-4">
        <PlanFilters
          plans={plans}
          filters={filters}
          onChange={(next) => update(next, openPlanId)}
          shown={visible.length}
          allowanceCents={allowanceCents}
          hasProviders={hasProviders}
          hasDrugs={hasDrugs}
        />
        <PlanList
          plans={visible}
          allPlans={plans}
          openPlanId={openPlanId}
          onOpenPlan={(hiosPlanId) => update(filters, hiosPlanId)}
          allowanceCents={allowanceCents}
          drugs={drugs}
        />
      </div>
    </TooltipProvider>
  )
}
