import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { jsonError } from '@/app/lib/api/respond'

/** Served from the checked-in file, so the repo copy and this one cannot drift. */
export async function GET() {
  try {
    const markdown = await readFile(join(process.cwd(), 'AGENTS_GUIDE.md'), 'utf8')
    return new Response(markdown, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  } catch {
    return jsonError(500, 'AGENTS_GUIDE.md is missing from the deployment.', 'Try GET /api for the machine-readable index.')
  }
}
