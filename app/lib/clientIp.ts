export function clientIp(req: Request): string | null {
  const h = req.headers
  const xff = h.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  for (const key of ['x-real-ip', 'cf-connecting-ip', 'fly-client-ip', 'true-client-ip']) {
    const v = h.get(key)?.trim()
    if (v) return v
  }
  return null
}
