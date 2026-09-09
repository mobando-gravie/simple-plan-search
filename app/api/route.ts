import { NextResponse } from 'next/server'
import { MAX_LIMIT } from '@/app/lib/api/query'

/** The bootstrap call: everything an agent needs to write its second request. */
const ENDPOINTS = [
  {
    method: 'GET',
    path: '/AGENTS_GUIDE.md',
    summary: 'This API explained, with copy-paste curl + jq recipes.',
  },
  {
    method: 'GET',
    path: '/api/plans',
    summary: 'Search the individual market. Plans are priced with the Gravie overlay.',
    required: ['zip'],
    optional: [
      'market',
      'age',
      'member_tobacco',
      'spouse_age',
      'spouse_tobacco',
      'child_ages',
      'income',
      'allowance',
      'enrollment_date',
      'providers',
      'drugs',
      'q',
      'metals',
      'plan_types',
      'carriers',
      'max_premium',
      'max_deductible',
      'hsa_only',
      'provider_coverage',
      'drug_coverage',
      'sort',
      'limit',
      'view',
      'refresh',
    ],
  },
  {
    method: 'GET',
    path: '/api/plans/{hiosPlanId}',
    summary: 'One plan in full: benefits, documents, per-applicant premiums, coverage.',
    required: ['zip'],
  },
  {
    method: 'GET',
    path: '/api/market',
    summary: 'Aggregate view of the same search: carriers, metals, plan types, premium spread.',
    required: ['zip'],
  },
  {
    method: 'GET',
    path: '/api/coverage',
    summary: 'Per-plan answers for your providers and drugs: in network, formulary tier.',
    required: ['zip', 'providers and/or drugs'],
  },
  {
    method: 'GET',
    path: '/api/providers',
    summary: 'Provider typeahead, 25 miles around a zip then 100 if empty.',
    required: ['zip', 'q'],
  },
  { method: 'GET', path: '/api/providers/{npi}', summary: 'Resolve one NPI to a named provider.' },
  {
    method: 'GET',
    path: '/api/drugs',
    summary: 'Drug typeahead, formulary-listed drugs only.',
    required: ['q'],
  },
  { method: 'GET', path: '/api/drugs/{rxcui}', summary: 'Resolve one RxCUI to a drug and its NDC.' },
  { method: 'GET', path: '/api/zip/{zip}', summary: 'Zip to FIPS code, state and county.' },
  {
    method: 'POST',
    path: '/api/resolve',
    summary: 'Batch resolve. Body: {"kind":"provider"|"drug","ids":["..."]}.',
  },
]

export async function GET() {
  return NextResponse.json({
    service: 'simple-plan-search',
    description:
      'Individual-market (ACA) plan search, cached, priced with the Gravie premium overlay.',
    guide: '/AGENTS_GUIDE.md',
    conventions: {
      money: 'Integer cents, every field suffixed Cents. Divide by 100 for dollars.',
      auth: 'IP allowlist, session cookie, or Authorization: Bearer <token>.',
      errors: '{"error": "...", "hint": "..."} with a 4xx or 5xx status; 502 adds retryable: true.',
      maxLimit: MAX_LIMIT,
    },
    endpoints: ENDPOINTS,
  })
}
