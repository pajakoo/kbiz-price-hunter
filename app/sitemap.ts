import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { CATEGORY_OPTIONS } from "@/lib/product-categories";
import { stapleProducts } from "@/lib/staple-profiles";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kbiz-price-hunter.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    select: { slug: true, categories: true },
    orderBy: { updatedAt: "desc" },
  });
  for (const profile of stapleProducts) {
    if (!products.some(product => product.slug === profile.slug)) products.push({ slug: profile.slug, categories: ["hrani"] });
  }

  const productEntries = locales.flatMap((locale) =>
    products.map((product) => ({
      url: `${baseUrl}/${locale}/products/${product.slug}`,
      alternates: {
        languages: {
          en: `${baseUrl}/en/products/${product.slug}`,
          bg: `${baseUrl}/bg/products/${product.slug}`,
        },
      },
    }))
  );

  const categoryEntries = CATEGORY_OPTIONS
    .filter((category) => products.some((product) => product.categories.includes(category.slug)))
    .flatMap((category) => locales.map((locale) => ({
      url: `${baseUrl}/${locale}/products/category/${category.slug}`,
      alternates: {
        languages: {
          en: `${baseUrl}/en/products/category/${category.slug}`,
          bg: `${baseUrl}/bg/products/category/${category.slug}`,
        },
      },
    })));

  return [
    {
      url: `${baseUrl}/en`,
      alternates: { languages: { en: `${baseUrl}/en`, bg: `${baseUrl}/bg` } },
    },
    {
      url: `${baseUrl}/bg`,
      alternates: { languages: { en: `${baseUrl}/en`, bg: `${baseUrl}/bg` } },
    },
    {
      url: `${baseUrl}/en/products`,
      alternates: {
        languages: { en: `${baseUrl}/en/products`, bg: `${baseUrl}/bg/products` },
      },
    },
    {
      url: `${baseUrl}/bg/products`,
      alternates: {
        languages: { en: `${baseUrl}/en/products`, bg: `${baseUrl}/bg/products` },
      },
    },
    ...categoryEntries,
    ...locales.map(locale => ({ url: `${baseUrl}/${locale}/products/staples`,
      alternates: { languages: { en: `${baseUrl}/en/products/staples`, bg: `${baseUrl}/bg/products/staples` } } })),
    ...productEntries,
  ];
}
