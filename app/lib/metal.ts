/**
 * One ordered source for the metal levels. Each consumer still derives its own view —
 * the URL codec must round-trip an unrecognised level, and the tooltip map has no
 * expanded_bronze entry — so this exports the list, not one merged table.
 */
export const METAL_LEVELS = [
  'bronze',
  'expanded_bronze',
  'silver',
  'gold',
  'platinum',
  'catastrophic',
] as const

export type MetalLevel = (typeof METAL_LEVELS)[number]

/** Short codes for the query string; `expanded_bronze` needs two characters. */
export const METAL_CODES: Record<MetalLevel, string> = {
  bronze: 'b',
  expanded_bronze: 'eb',
  silver: 's',
  gold: 'g',
  platinum: 'p',
  catastrophic: 'c',
}

export function isMetalLevel(raw: string): raw is MetalLevel {
  return (METAL_LEVELS as readonly string[]).includes(raw)
}
