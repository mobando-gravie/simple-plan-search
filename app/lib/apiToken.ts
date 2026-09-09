/**
 * Shared secrets for headless callers, the sibling of ipMatch's IP rules:
 * API_TOKENS is a comma-separated list, and a request presents one as
 * `Authorization: Bearer <token>` or `X-Api-Key: <token>`.
 */
export function parseApiTokens(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token !== '')
}

/** Constant time in the token's length, so a wrong token leaks no prefix. */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** No configured tokens means the bearer path is off, not that everything passes. */
export function isValidApiToken(presented: string | null, tokens: string[]): boolean {
  if (!presented) return false
  let ok = false
  for (const token of tokens) ok = equals(presented, token) || ok
  return ok
}

export function presentedToken(headers: Headers): string | null {
  const auth = headers.get('authorization')?.trim() ?? ''
  const bearer = /^Bearer\s+(.+)$/i.exec(auth)
  if (bearer) return bearer[1].trim()
  return headers.get('x-api-key')?.trim() || null
}
