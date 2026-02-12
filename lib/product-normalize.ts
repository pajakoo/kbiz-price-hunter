const LEADING_PUNCTUATION = /^[,.;:]+/;

export function normalizeProductName(value: string) {
  return value.trim().replace(LEADING_PUNCTUATION, "").trim();
}
