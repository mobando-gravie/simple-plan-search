/** The subset of Ideon's plan-search contract this app reads. */

export type Applicant = { age: number; smoker: boolean; child: boolean }

export type PlanSearchInput = {
  zipCode: string
  fipsCode: string
  market: 'individual' | 'small_group'
  applicants: Applicant[]
  householdIncome?: number
  householdSize?: number
  enrollmentDate?: string
  page: number
  perPage: number
  sort: string
}

/** A formatted cost-share string like "$1,550" / "Not Covered" / "Included in Medical". */
export type CostShare = {
  in_network: string | null
  out_of_network: string | null
  limit: string | null
} | null

export type IdeonPlan = {
  id: string
  name?: string | null
  display_name?: string | null
  premium?: number | null
  carrier_name?: string | null
  hios_issuer_id?: string | null
  level?: string | null
  plan_type?: string | null
  hsa_eligible?: boolean | null
  effective_date?: string | null
  individual_medical_deductible?: CostShare
  family_medical_deductible?: CostShare
  individual_medical_moop?: CostShare
  family_medical_moop?: CostShare
  carrier?: { id?: string; issuer_id?: string; name?: string } | null
}

export type IdeonPlanSearchResponse = {
  plans: IdeonPlan[]
  meta: {
    total?: number
    premium_tax_credit?: number | null
    eligible_for_chip_medicaid?: boolean | null
    state_subsidy?: number | null
  }
}

export type ZipCounty = {
  fipsCode: string
  state: string
  countyName: string | null
}
