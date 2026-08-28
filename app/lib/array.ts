/** In or out — the shape every multi-select filter chip needs. */
export function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
}

/** Appends unless an item with the same key is already there; returns the input if so. */
export function addUnique<T>(values: T[], item: T, keyOf: (value: T) => string): T[] {
  const key = keyOf(item)
  return values.some((v) => keyOf(v) === key) ? values : [...values, item]
}
