import 'server-only'

const PASSWORDS_ENV = 'APP_PASSWORDS'

export function getPasswords(): string[] {
  const raw = process.env[PASSWORDS_ENV]
  if (!raw) {
    throw new Error(`${PASSWORDS_ENV} must be set`)
  }
  const list = raw.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
  if (list.length === 0) {
    throw new Error(`${PASSWORDS_ENV} must contain at least one password`)
  }
  return list
}

export function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  let diff = ab.length ^ bb.length
  const n = Math.max(ab.length, bb.length)
  for (let i = 0; i < n; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  }
  return diff === 0
}

export function matchPassword(submitted: string): boolean {
  let matched = 0
  for (const p of getPasswords()) {
    matched |= constantTimeEqual(submitted, p) ? 1 : 0
  }
  return matched === 1
}
