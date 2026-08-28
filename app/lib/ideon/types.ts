/** The subset of Ideon's plan-search contract this app reads. */

export type Applicant = { age: number; smoker: boolean; child: boolean }

export type SelectedProvider = { npi: number; name: string }
export type SelectedDrug = {
  medId: number
  /** null when a pasted RxCUI did not resolve — no package, so it cannot be asked about. */
  ndc: string | null
  name: string
  /** Set when the drug arrived as a pasted identifier rather than from the typeahead. */
  rxcui?: number
}

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
  providers?: SelectedProvider[]
  drugs?: SelectedDrug[]
}

/**
 * A formatted cost share. v8 returns an object; v7 returns one string shaped
 * "In-Network: $1,550 / Out-of-Network: Not Covered".
 */
export type CostShare =
  | { in_network: string | null; out_of_network: string | null; limit: string | null }
  | string
  | null

export type IdeonPlan = {
  id: string
  name?: string | null
  display_name?: string | null
  premium?: number | null
  premiums_by_applicant?: {
    age?: number | null
    child?: boolean | null
    smoker?: boolean | null
    premium?: number | null
    composite_rated?: boolean | null
    waived_for_total?: boolean | null
  }[]
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
  carrier?: { id?: string; issuer_id?: string; name?: string; logo_url?: string | null } | null
  on_market?: boolean | null
  off_market?: boolean | null
  plan_documents?: { type?: string | null; url?: string | null }[]
  benefits_summary_url?: string | null
  drug_formulary_url?: string | null
  /** Present only on a v7 search that supplied `providers`. */
  providers?: { npi?: number | null; in_network?: boolean | null }[]
}

/** Response-level drug coverage, keyed to a plan by `plan_id`. */
export type IdeonCoverage = {
  plan_id?: string | null
  drug_package_id?: string | null
  tier?: string | null
  prior_authorization?: boolean | null
  quantity_limit?: boolean | null
  step_therapy?: boolean | null
}

export type IdeonPlanSearchResponse = {
  plans: IdeonPlan[]
  coverages?: IdeonCoverage[]
  meta: {
    total?: number
    premium_tax_credit?: number | null
    eligible_for_chip_medicaid?: boolean | null
    state_subsidy?: number | null
  }
}

export type DrugHit = {
  /** The formulary-check key. Null-valued hits are not returned. */
  medId: number
  name: string
  packages: { ndc: string; label: string }[]
}

export type ProviderHit = {
  npi: number
  name: string
  specialty: string | null
  type: string | null
  city: string | null
}

export type ZipCounty = {
  fipsCode: string
  state: string
  countyName: string | null
}
