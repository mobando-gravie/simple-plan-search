import { NextResponse } from 'next/server'
import { errorMessage } from '@/app/lib/errors'
import { isNpi, isRxcui } from '@/app/lib/identifiers'
import { resolveDrugs, resolveProviders } from '@/app/lib/services/entityLookup'

/** A paste is one member's row; well past that is a mistake, not a use case. */
const MAX_IDS = 50

export async function POST(request: Request) {
  let body: { kind?: unknown; ids?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 })
  }

  const kind = body.kind
  if (kind !== 'provider' && kind !== 'drug') {
    return NextResponse.json({ error: 'kind must be "provider" or "drug".' }, { status: 400 })
  }
  if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'ids must be an array of strings.' }, { status: 400 })
  }

  const shaped = kind === 'provider' ? isNpi : isRxcui
  const ids = (body.ids as string[]).filter(shaped).slice(0, MAX_IDS)
  // Malformed ids never reach Ideon, but they are still reported so a typo is not
  // silently swallowed.
  const malformed = (body.ids as string[]).filter((id) => !shaped(id))

  try {
    const { resolved, unresolved } =
      kind === 'provider' ? await resolveProviders(ids) : await resolveDrugs(ids)
    return NextResponse.json({ resolved, unresolved: [...unresolved, ...malformed] })
  } catch (e) {
    return NextResponse.json(
      { error: errorMessage(e, 'Resolve failed.'), resolved: [], unresolved: body.ids },
      { status: 502 },
    )
  }
}
