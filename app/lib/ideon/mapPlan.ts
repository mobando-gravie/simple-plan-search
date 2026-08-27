import { dollarsToCents, parseCurrencyToCents } from '../money'
import type { CostShare, IdeonPlan } from './types'

/** An Ideon plan reduced to the fields this app prices and displays, in cents. */
export type MappedPlan = {
  hiosPlanId: string
  planName: string
  carrierName: string
  carrierId: string | null
  metalLevel: string | null
  planType: string | null
  ideonPremiumCents: number | null
  effectiveYear: number | null
  hsaEligible: boolean
  deductibleIndividualCents: number | null
  deductibleFamilyCents: number | null
  outOfPocketMaxIndividualCents: number | null
  outOfPocketMaxFamilyCents: number | null
}

function inNetworkCents(share: CostShare | undefined): number | null {
  return parseCurrencyToCents(share?.in_network)
}

export function mapPlan(plan: IdeonPlan): MappedPlan {
  const premium = plan.premium
  return {
    hiosPlanId: plan.id,
    planName: plan.display_name ?? plan.name ?? plan.id,
    carrierName: plan.carrier?.name ?? plan.carrier_name ?? 'Unknown carrier',
    carrierId: plan.carrier?.issuer_id ?? plan.hios_issuer_id ?? null,
    metalLevel: plan.level?.toLowerCase() ?? null,
    planType: plan.plan_type ?? null,
    ideonPremiumCents:
      typeof premium === 'number' && Number.isFinite(premium) ? dollarsToCents(premium) : null,
    effectiveYear: plan.effective_date ? Number(plan.effective_date.slice(0, 4)) : null,
    hsaEligible: plan.hsa_eligible === true,
    deductibleIndividualCents: inNetworkCents(plan.individual_medical_deductible),
    deductibleFamilyCents: inNetworkCents(plan.family_medical_deductible),
    outOfPocketMaxIndividualCents: inNetworkCents(plan.individual_medical_moop),
    outOfPocketMaxFamilyCents: inNetworkCents(plan.family_medical_moop),
  }
}
