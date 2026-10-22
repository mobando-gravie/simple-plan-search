import { NextResponse } from 'next/server'
import { toCsv } from '../csv'
import { DETAIL_TTL_SECONDS, edgeCache } from './cacheHeaders'

/**
 * A GET route that offers `format=csv` alongside its JSON. `format` lives in the query string, so
 * the edge caches the two representations separately. Both carry the long detail-TTL headers.
 */
export type Format = 'json' | 'csv'

export function parseFormat(raw: string | null): Format | null {
  const f = (raw ?? 'json').trim().toLowerCase()
  return f === 'json' || f === 'csv' ? f : null
}

type Csv = { headers: string[]; rows: (string | number | null | undefined)[][]; filename: string }

export function dataResponse(format: Format, json: unknown, csv: Csv): NextResponse {
  const cache = edgeCache(DETAIL_TTL_SECONDS, DETAIL_TTL_SECONDS)
  if (format === 'csv') {
    return new NextResponse(toCsv(csv.headers, csv.rows), {
      headers: {
        ...cache,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csv.filename}"`,
      },
    })
  }
  return NextResponse.json(json, { headers: cache })
}
