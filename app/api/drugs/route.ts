import { NextResponse } from 'next/server'
import { hitsResponse } from '@/app/lib/hitsRoute'
import { lookupDrugs } from '@/app/lib/services/entityLookup'
import { MIN_SEARCH_TERM } from '@/app/lib/validation'

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (term.length < MIN_SEARCH_TERM) return NextResponse.json({ hits: [] })
  return hitsResponse('drug search failed', () => lookupDrugs(term))
}
