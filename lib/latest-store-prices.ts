// Callers supply observations newest first, with a deterministic tie-breaker.
export function latestStorePrices<T extends { storeId: string; amount: number }>(prices: T[]) {
  const latest = new Map<string, T>();
  for (const price of prices) {
    if (!latest.has(price.storeId)) latest.set(price.storeId, price);
  }
  return latest;
}
