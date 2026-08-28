import { dollarsToCents } from '../money'
import { inNetworkCents, planCoverage, type PlanCoverage } from './coverage'
import type { IdeonCoverage, IdeonPlan } from './types'

/** One person's slice of a plan's premium, as Ideon returns it. */
export type ApplicantPremium = {
  age: number | null
  child: boolean
  /** null on a composite-rated plan — Ideon prices those by household tier. */
  premiumCents: number | null
  /** ACA three-oldest-children-under-21 cap. */
  waived: boolean
}

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
  logoUrl: string | null
  coverage: PlanCoverage
  applicantPremiums: ApplicantPremium[]
  /** True when no applicant carries a figure — the whole plan is tier priced. */
  compositeRated: boolean
}

export function mapPlan(plan: IdeonPlan, drugCoverages: IdeonCoverage[] = []): MappedPlan {
  const premium = plan.premium
  const applicantPremiums: ApplicantPremium[] = (plan.premiums_by_applicant ?? []).map((a) => ({
    age: a.age ?? null,
    child: a.child === true,
    premiumCents:
      typeof a.premium === 'number' && Number.isFinite(a.premium) ? dollarsToCents(a.premium) : null,
    waived: a.waived_for_total === true,
  }))
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
    logoUrl: plan.carrier?.logo_url ?? null,
    coverage: planCoverage(plan, drugCoverages),
    deductibleIndividualCents: inNetworkCents(plan.individual_medical_deductible),
    deductibleFamilyCents: inNetworkCents(plan.family_medical_deductible),
    outOfPocketMaxIndividualCents: inNetworkCents(plan.individual_medical_moop),
    outOfPocketMaxFamilyCents: inNetworkCents(plan.family_medical_moop),
    applicantPremiums,
    compositeRated:
      applicantPremiums.length > 0 && applicantPremiums.every((a) => a.premiumCents === null),
  }
}
