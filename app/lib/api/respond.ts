import { NextResponse } from 'next/server'

/**
 * The one error envelope every /api route returns. `hint` is what an agent should
 * do next, not a restatement of the error.
 */
export function jsonError(status: number, error: string, hint?: string): NextResponse {
  return NextResponse.json(hint ? { error, hint } : { error }, { status })
}

const RETRY_HINT =
  'Temporary. Retry with exponential backoff; if it persists, drop providers and drugs to use the cheaper search.'

/**
 * An upstream failure. The detail names the data source, its path and its status,
 * so it is logged and never returned; callers branch on `retryable`, not on text.
 */
export function upstreamError(e: unknown, error: string): NextResponse {
  console.error(error, e)
  return NextResponse.json({ error, hint: RETRY_HINT, retryable: true }, { status: 502 })
}
