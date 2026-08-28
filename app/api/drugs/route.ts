import { NextResponse } from 'next/server'
import { lookupDrugs } from '@/app/lib/services/entityLookup'

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (term.length < 3) return NextResponse.json({ hits: [] })
  try {
    return NextResponse.json({ hits: await lookupDrugs(term) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'drug search failed'
    return NextResponse.json({ hits: [], error: message }, { status: 502 })
  }
}
