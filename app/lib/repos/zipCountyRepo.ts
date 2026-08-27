import { query, queryOne } from '../db'
import type { ZipCounty } from '../ideon/types'

export async function findZipCounty(zip: string): Promise<ZipCounty | null> {
  const row = await queryOne<{ fips_code: string; state: string; county_name: string | null }>(
    `SELECT fips_code, state, county_name FROM sps_zip_county_cache WHERE zip_code = $1`,
    [zip],
  )
  if (!row) return null
  return { fipsCode: row.fips_code, state: row.state, countyName: row.county_name }
}

export async function saveZipCounty(zip: string, county: ZipCounty): Promise<void> {
  await query(
    `INSERT INTO sps_zip_county_cache (zip_code, fips_code, state, county_name, fetched_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (zip_code) DO UPDATE SET
       fips_code   = EXCLUDED.fips_code,
       state       = EXCLUDED.state,
       county_name = EXCLUDED.county_name,
       fetched_at  = now()`,
    [zip, county.fipsCode, county.state, county.countyName],
  )
}
