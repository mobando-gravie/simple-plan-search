/** Unknown throwables reach five call sites; each one wants a string and a fallback. */
export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback
}
