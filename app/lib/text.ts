/** English count agreement, for the handful of places that interpolate a total. */
export function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many
}
