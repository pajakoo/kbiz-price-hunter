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
    }))
  );

  const now = new Date();

  return [
    { url: `${baseUrl}/en`, lastModified: now },
    { url: `${baseUrl}/bg`, lastModified: now },
    { url: `${baseUrl}/en/products`, lastModified: now },
    { url: `${baseUrl}/bg/products`, lastModified: now },
    ...productEntries,
  ];
}
