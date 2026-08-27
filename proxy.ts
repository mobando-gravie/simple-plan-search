import { NextResponse, type NextRequest } from 'next/server'
import { decrypt } from '@/app/lib/session'
import { clientIp } from '@/app/lib/clientIp'
import { parseAllowedIps, isAllowed } from '@/app/lib/ipMatch'

const allowedIpRules = parseAllowedIps(process.env.ALLOWED_IPS)

export default async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  const ip = clientIp(req)
  if (ip && isAllowed(ip, allowedIpRules)) {
    return NextResponse.next()
  }

  const session = await decrypt(req.cookies.get('session')?.value)
  if (session) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', req.nextUrl)
  loginUrl.searchParams.set('from', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
