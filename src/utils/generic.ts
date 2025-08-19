
/**
 * Helper function for filtering out empty-ish entries in an array
 * @example [0, 1, 2, null, 4, undefined, 5, "", false].filter(filterEmpty) return [0, 1, 2, 4, 5, false]
 */
export function filterEmpty<T>(value: T | null | undefined): value is T {
  return value != null && value !== '';
}
