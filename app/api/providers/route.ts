import { NextResponse } from 'next/server'
import { searchProviders } from '@/app/lib/ideon/client'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const term = params.get('q')?.trim() ?? ''
  const zip = params.get('zip')?.trim() ?? ''
  // Provider search is geographic; without a zip there is nothing to search around.
  if (term.length < 3 || !/^\d{5}$/.test(zip)) return NextResponse.json({ hits: [] })
  try {
    return NextResponse.json({ hits: await searchProviders(zip, term) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'provider search failed'
    return NextResponse.json({ hits: [], error: message }, { status: 502 })
  }
}
