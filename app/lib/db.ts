import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// Neon's HTTP driver talks over 443 rather than 5432, which the VPN blocks.
let client: NeonQueryFunction<false, false> | undefined

export function sql(): NeonQueryFunction<false, false> {
  if (!client) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL must be set')
    client = neon(connectionString)
  }
  return client
}

export async function query<T>(text: string, values: unknown[] = []): Promise<T[]> {
  return (await sql().query(text, values)) as T[]
}

export async function queryOne<T>(text: string, values: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, values)
  return rows[0] ?? null
}
