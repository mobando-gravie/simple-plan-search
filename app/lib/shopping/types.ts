/**
 * The slice of ichra-shopping's `FetchPlansResponse` this app compares against
 * (`GET /interviews/{interviewId}/plans`). Shopping prices via IMPC, not Ideon,
 * so its numbers are an independent baseline.
 */
export type ShoppingPlan = {
  hiosPlanId: string
  planName?: string | null
  issuerName?: string | null
  metalLevel?: string | null
  planType?: string | null
  premiumCents?: number | null
  deductibleIndividualCents?: number | null
  outOfPocketMaxIndividualCents?: number | null
  hsaEligible?: boolean | null
}

export type FetchPlansResponse = {
  plans: ShoppingPlan[]
  householdSize?: number | null
}
