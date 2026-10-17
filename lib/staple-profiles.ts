import profiles from "./staple-products.json";

export const stapleProducts = profiles;
export type StapleProduct = (typeof profiles)[number];
export function getStapleProduct(slug: string) {
  return stapleProducts.find((profile) => profile.slug === slug);
}
