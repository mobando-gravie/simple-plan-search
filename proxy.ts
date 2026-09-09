import { NextResponse, type NextRequest } from 'next/server'
import { decrypt } from '@/app/lib/session'
import { clientIp } from '@/app/lib/clientIp'
import { isValidApiToken, parseApiTokens, presentedToken } from '@/app/lib/apiToken'
import { parseAllowedIps, isAllowed } from '@/app/lib/ipMatch'

const allowedIpRules = parseAllowedIps(process.env.ALLOWED_IPS)
const apiTokens = parseApiTokens(process.env.API_TOKENS)

const GUIDE_PATH = '/AGENTS_GUIDE.md'

/** Machine surfaces answer a rejection with JSON — a 302 to an HTML form breaks `jq`. */
function isMachinePath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/') || pathname === GUIDE_PATH
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    {
      error: 'Unauthorized.',
      hint: `Call from an allowlisted IP, or send Authorization: Bearer <token> with a token from API_TOKENS. See ${GUIDE_PATH}.`,
    },
    { status: 401 },
  )
}

export default async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  const ip = clientIp(req)
  if (ip && isAllowed(ip, allowedIpRules)) {
    return NextResponse.next()
  }

  if (isValidApiToken(presentedToken(req.headers), apiTokens)) {
    return NextResponse.next()
  }

  const session = await decrypt(req.cookies.get('session')?.value)
  if (session) {
    return NextResponse.next()
  }

  if (isMachinePath(req.nextUrl.pathname)) {
    return unauthorized()
  }

  const loginUrl = new URL('/login', req.nextUrl)
  loginUrl.searchParams.set('from', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
