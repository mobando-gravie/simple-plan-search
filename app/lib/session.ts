import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const TEN_YEARS_SECONDS = 60 * 60 * 24 * 365 * 10

function signingKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET must be set')
  return new TextEncoder().encode(secret)
}

export type SessionPayload = { authed: true }

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(signingKey())
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | undefined> {
  if (!token) return undefined
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ['HS256'] })
    return payload.authed === true ? { authed: true } : undefined
  } catch {
    return undefined
  }
}

export async function createSession() {
  const token = await encrypt({ authed: true })
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TEN_YEARS_SECONDS,
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
