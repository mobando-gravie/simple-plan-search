/** Joins class fragments, dropping the empty ones an optional prop leaves behind. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
