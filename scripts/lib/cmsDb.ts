/**
 * Thin reader over the local CMS PUF warehouse for the build-* extractors.
 * Shells out to the sqlite3 CLI with -json so the repo needs no sqlite driver;
 * the warehouse is local-only and never shipped. Set CMS_DB to override the path.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const CMS_DB = process.env.CMS_DB || join(homedir(), 'public-use-files/db/cms.sqlite')

export function assertDb(): void {
  if (!existsSync(CMS_DB)) {
    throw new Error(`CMS warehouse not found at ${CMS_DB}. Set CMS_DB to its path.`)
  }
}

/** Run one read-only query and parse the JSON rows. Large result sets stream fine via the CLI. */
export function querySqlite<T = Record<string, unknown>>(sql: string): T[] {
  const out = execFileSync('sqlite3', ['-json', '-readonly', CMS_DB, sql], {
    encoding: 'utf8',
    maxBuffer: 1 << 30, // 1 GiB — some per-year slices are large
  })
  const trimmed = out.trim()
  return trimmed ? (JSON.parse(trimmed) as T[]) : []
}
