import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kbiz-price-hunter.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const productEntries = locales.flatMap((locale) =>
    products.map((product) => ({
      url: `${baseUrl}/${locale}/products/${product.slug}`,
      lastModified: product.updatedAt,
      alternates: {
        languages: {
          en: `${baseUrl}/en/products/${product.slug}`,
          bg: `${baseUrl}/bg/products/${product.slug}`,
        },
      },
    }))
  );

  const now = new Date();

  return [
    {
      url: `${baseUrl}/en`,
      lastModified: now,
      alternates: { languages: { en: `${baseUrl}/en`, bg: `${baseUrl}/bg` } },
    },
    {
      url: `${baseUrl}/bg`,
      lastModified: now,
      alternates: { languages: { en: `${baseUrl}/en`, bg: `${baseUrl}/bg` } },
    },
    {
      url: `${baseUrl}/en/products`,
      lastModified: now,
      alternates: {
        languages: { en: `${baseUrl}/en/products`, bg: `${baseUrl}/bg/products` },
      },
    },
    {
      url: `${baseUrl}/bg/products`,
      lastModified: now,
      alternates: {
        languages: { en: `${baseUrl}/en/products`, bg: `${baseUrl}/bg/products` },
      },
    },
    ...productEntries,
  ];
}
