import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";
import { UNASSIGNED_CATEGORY } from "@/lib/product-categories";

export type ProductCard = {
  slug: string;
  name: string;
  summary: string;
  priceNote?: string;
  lastChecked?: string;
  categories: string[];
};

type ProductListOptions = {
  locale: Locale;
  page: number;
  pageSize: number;
  query?: string | null;
  categories?: string[];
};

export async function getProductCards({
  locale,
  page,
  pageSize,
  query,
  categories = [],
}: ProductListOptions) {
  const dict = getDictionary(locale);
  const normalizedQuery = query?.trim() ?? "";

  const where = {
    ...(normalizedQuery
      ? {
          OR: [
            { name: { contains: normalizedQuery, mode: "insensitive" as const } },
            { description: { contains: normalizedQuery, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(categories.length ? { categories: { hasEvery: categories } } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  const currencyFormatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const rangeLabel = locale === "bg" ? "Среден диапазон" : "Avg range";
  const updatedLabel = locale === "bg" ? "Обновено" : "Updated";

  const productIds = products.map((product) => product.id);
  const priceAggregates = productIds.length
    ? await prisma.price.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds } },
        _min: { amount: true },
        _max: { amount: true, recordedAt: true },
      })
    : [];

  const priceStats = new Map(
    priceAggregates.map((aggregate) => [aggregate.productId, aggregate])
  );

  const cards: ProductCard[] = products.map((product) => {
    const stats = priceStats.get(product.id);
    const minAmount = stats?._min?.amount ?? null;
    const maxAmount = stats?._max?.amount ?? null;
    const recordedAt = stats?._max?.recordedAt ?? null;
    const priceNote =
      minAmount !== null && maxAmount !== null
        ? `${rangeLabel}: ${currencyFormatter.format(minAmount)} - ${currencyFormatter.format(
            maxAmount
          )} EUR`
        : dict.products.fallbackPriceNote;
    const lastChecked = recordedAt
      ? `${updatedLabel} ${dateFormatter.format(recordedAt)}`
      : dict.products.fallbackLastChecked;

    return {
      slug: product.slug,
      name: product.name,
      summary: product.description?.trim() || dict.products.fallbackSummary,
      priceNote,
      lastChecked,
      categories: product.categories.length ? product.categories : [UNASSIGNED_CATEGORY.slug],
    };
  });

  return { products: cards, total };
}
