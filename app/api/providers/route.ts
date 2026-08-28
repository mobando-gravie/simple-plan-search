import { NextResponse } from 'next/server'
import { hitsResponse } from '@/app/lib/hitsRoute'
import { lookupProviders } from '@/app/lib/services/entityLookup'
import { isZipCode, MIN_SEARCH_TERM } from '@/app/lib/validation'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const term = params.get('q')?.trim() ?? ''
  const zip = params.get('zip')?.trim() ?? ''
  // Provider search is geographic; without a zip there is nothing to search around.
  if (term.length < MIN_SEARCH_TERM || !isZipCode(zip)) return NextResponse.json({ hits: [] })
  return hitsResponse('provider search failed', () => lookupProviders(zip, term))
}
