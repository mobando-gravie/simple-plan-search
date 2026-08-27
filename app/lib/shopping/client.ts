import { readFile } from 'node:fs/promises'
import type { FetchPlansResponse, ShoppingPlan } from './types'

/**
 * Accepts either a bare `FetchPlansResponse` or anything that wraps a `plans`
 * array — a saved HTTP envelope, for instance — so a hand-exported file works
 * without reshaping.
 */
export function coerceFetchPlansResponse(body: unknown): FetchPlansResponse {
  if (Array.isArray(body)) return { plans: body as ShoppingPlan[] }
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    if (Array.isArray(obj.plans)) {
      return { plans: obj.plans as ShoppingPlan[], householdSize: obj.householdSize as number }
    }
    if (obj.body && typeof obj.body === 'object') return coerceFetchPlansResponse(obj.body)
  }
  throw new Error('baseline JSON has no `plans` array')
}

export async function loadBaselineFile(path: string): Promise<FetchPlansResponse> {
  return coerceFetchPlansResponse(JSON.parse(await readFile(path, 'utf8')))
}

export async function fetchBaseline(
  baseUrl: string,
  interviewId: string,
  headers: Record<string, string> = {},
): Promise<FetchPlansResponse> {
  const url = `${baseUrl.replace(/\/$/, '')}/interviews/${encodeURIComponent(interviewId)}/plans`
  const response = await fetch(url, { headers: { Accept: 'application/json', ...headers } })
  if (!response.ok) {
    throw new Error(`shopping GET ${url} → ${response.status}: ${(await response.text()).slice(0, 300)}`)
  }
  return coerceFetchPlansResponse(await response.json())
}
