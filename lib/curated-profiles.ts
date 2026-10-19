import { getStapleProduct } from "./staple-profiles";
import enrichments from "./product-enrichments.json";

export type CuratedFact = { bg: string; en: string };
export type CuratedSource = { label: string; url: string };

export type CuratedProfile = {
  slug: string;
  name: string;
  brand: string;
  description: CuratedFact;
  facts: CuratedFact[];
  values: [string, string][];
  valuesCaption: CuratedFact;
  sources: CuratedSource[];
  checked: string;
  gtin?: string;
  quantity: number;
  unit: "kg" | "l";
};

type EnrichmentEntry = {
  slug: string;
  name: string;
  brand: string;
  description: CuratedFact;
  facts: CuratedFact[];
  values?: [string, string][];
  valuesCaption?: CuratedFact;
  sources?: CuratedSource[];
  checked: string;
  gtin?: string;
  quantity?: number;
  unit?: string;
};

const enrichmentProfiles: CuratedProfile[] = (enrichments as EnrichmentEntry[]).map((entry) => ({
  slug: entry.slug,
  name: entry.name,
  brand: entry.brand,
  description: entry.description,
  facts: entry.facts,
  values: entry.values ?? [],
  valuesCaption: entry.valuesCaption ?? { bg: "", en: "" },
  sources: entry.sources ?? [],
  checked: entry.checked,
  ...(entry.gtin ? { gtin: entry.gtin } : {}),
  quantity: entry.quantity ?? 1,
  unit: entry.unit === "kg" ? "kg" : "l",
}));

/**
 * Curated copy for a product page. Staples keep their extraction profiles;
 * enrichments add facts and descriptions for products already in the database,
 * without touching the staple importer or its price records.
 */
export function getCuratedProfile(slug: string): CuratedProfile | null {
  const staple = getStapleProduct(slug);
  if (staple) {
    return {
      ...staple,
      values: staple.values as [string, string][],
      unit: staple.unit as "kg" | "l",
    };
  }
  return enrichmentProfiles.find((profile) => profile.slug === slug) ?? null;
}

export function getEnrichment(slug: string): CuratedProfile | null {
  return enrichmentProfiles.find((profile) => profile.slug === slug) ?? null;
}
