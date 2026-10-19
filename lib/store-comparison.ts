export type ComparisonStore = { id: string; name: string };
export const MAX_COMPARISON_STORES = 5;

export function parseComparison(value: string): ComparisonStore[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const stores = parsed.filter((item): item is ComparisonStore => Boolean(item) &&
      typeof item.id === "string" && item.id.length > 0 && typeof item.name === "string");
    return [...new Map(stores.map(store => [store.id, store])).values()].slice(0, MAX_COMPARISON_STORES);
  } catch { return []; }
}

export function toggleComparison(stores: ComparisonStore[], store: ComparisonStore) {
  return stores.some(item => item.id === store.id) ? stores.filter(item => item.id !== store.id)
    : stores.length < MAX_COMPARISON_STORES ? [...stores, store] : stores;
}
