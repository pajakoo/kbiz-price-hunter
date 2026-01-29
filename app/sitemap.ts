import type { MetadataRoute } from "next";
import { products } from "@/lib/products";
import { locales } from "@/lib/i18n";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kbiz-price-hunter.example";

export default function sitemap(): MetadataRoute.Sitemap {
  const productEntries = locales.flatMap((locale) =>
    products.map((product) => ({
      url: `${baseUrl}/${locale}/products/${product.slug}`,
      lastModified: new Date(),
    }))
  );

  return [
    { url: `${baseUrl}/en`, lastModified: new Date() },
    { url: `${baseUrl}/bg`, lastModified: new Date() },
    { url: `${baseUrl}/en/products`, lastModified: new Date() },
    { url: `${baseUrl}/bg/products`, lastModified: new Date() },
    ...productEntries,
  ];
}
