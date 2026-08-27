export type ParsedIp = { version: 4 | 6; value: bigint }
export type IpRule = { version: 4 | 6; value: bigint; prefix: number }

const ZERO = BigInt(0)
const ONE = BigInt(1)
const EIGHT = BigInt(8)
const SIXTEEN = BigInt(16)
const THIRTY_TWO = BigInt(32)
const NINETY_SIX = BigInt(96)
const FFFF_HEX = BigInt(0xffff)
const V4_MASK = BigInt('0xffffffff')
const V4_MAPPED_PREFIX = FFFF_HEX << THIRTY_TWO
const V4_MAPPED_HOST_MASK = ((ONE << NINETY_SIX) - ONE) << THIRTY_TWO

function parseIpv4(s: string): bigint | null {
  const parts = s.split('.')
  if (parts.length !== 4) return null
  let v = ZERO
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null
    const n = Number(p)
    if (n < 0 || n > 255) return null
    v = (v << EIGHT) | BigInt(n)
  }
  return v
}

function parseIpv6(s: string): bigint | null {
  s = s.split('%')[0]

  const dotIdx = s.indexOf('.')
  if (dotIdx >= 0) {
    const colonBeforeDot = s.lastIndexOf(':', dotIdx)
    if (colonBeforeDot < 0) return null
    const v4 = parseIpv4(s.slice(colonBeforeDot + 1))
    if (v4 === null) return null
    const high16 = Number((v4 >> SIXTEEN) & FFFF_HEX).toString(16)
    const low16 = Number(v4 & FFFF_HEX).toString(16)
    s = s.slice(0, colonBeforeDot) + ':' + high16 + ':' + low16
  }

  const parts = s.split('::')
  if (parts.length > 2) return null

  const left = parts[0] === '' ? [] : parts[0].split(':')
  const right = parts.length === 2 ? (parts[1] === '' ? [] : parts[1].split(':')) : null

  const isHex = (g: string) => /^[0-9a-fA-F]{1,4}$/.test(g)
  if (!left.every(isHex)) return null
  if (right && !right.every(isHex)) return null

  let groups: string[]
  if (right === null) {
    if (left.length !== 8) return null
    groups = left
  } else {
    const fillCount = 8 - left.length - right.length
    if (fillCount < 0) return null
    groups = [...left, ...Array(fillCount).fill('0'), ...right]
  }

  let v = ZERO
  for (const g of groups) {
    v = (v << SIXTEEN) | BigInt(parseInt(g, 16))
  }
  return v
}

export function parseIp(s: string): ParsedIp | null {
  const trimmed = s.trim()
  if (trimmed.includes(':')) {
    const v = parseIpv6(trimmed)
    return v === null ? null : { version: 6, value: v }
  }
  const v = parseIpv4(trimmed)
  return v === null ? null : { version: 4, value: v }
}

export function parseRule(s: string): IpRule | null {
  const trimmed = s.trim()
  const slash = trimmed.indexOf('/')
  const ipPart = slash >= 0 ? trimmed.slice(0, slash) : trimmed
  const prefixPart = slash >= 0 ? trimmed.slice(slash + 1) : null
  const ip = parseIp(ipPart)
  if (!ip) return null
  const maxPrefix = ip.version === 4 ? 32 : 128
  let prefix = maxPrefix
  if (prefixPart !== null) {
    if (!/^\d+$/.test(prefixPart)) return null
    prefix = parseInt(prefixPart, 10)
    if (prefix < 0 || prefix > maxPrefix) return null
  }
  return { version: ip.version, value: ip.value, prefix }
}

// IPv4-mapped IPv6 (::ffff:0:0/96) → unwrap to IPv4 so v4 rules match.
function normalize(ip: ParsedIp): ParsedIp {
  if (ip.version === 6 && (ip.value & V4_MAPPED_HOST_MASK) === V4_MAPPED_PREFIX) {
    return { version: 4, value: ip.value & V4_MASK }
  }
  return ip
}

export function ipMatchesRule(ip: ParsedIp, rule: IpRule): boolean {
  const n = normalize(ip)
  if (n.version !== rule.version) return false
  const totalBits = n.version === 4 ? 32 : 128
  const shift = BigInt(totalBits - rule.prefix)
  return (n.value >> shift) === (rule.value >> shift)
}

export function parseAllowedIps(env: string | undefined): IpRule[] {
  if (!env) return []
  return env
    .split(',')
    .map((s) => parseRule(s))
    .filter((r): r is IpRule => r !== null)
}

export function isAllowed(clientIp: string, rules: IpRule[]): boolean {
  if (rules.length === 0) return false
  const ip = parseIp(clientIp)
  if (!ip) return false
  return rules.some((r) => ipMatchesRule(ip, r))
}
