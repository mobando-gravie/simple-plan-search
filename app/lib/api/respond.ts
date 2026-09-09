import { NextResponse } from 'next/server'

/**
 * The one error envelope every /api route returns. `hint` is what an agent should
 * do next, not a restatement of the error.
 */
export function jsonError(status: number, error: string, hint?: string): NextResponse {
  return NextResponse.json(hint ? { error, hint } : { error }, { status })
}
