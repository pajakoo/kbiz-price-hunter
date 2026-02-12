import { prisma } from "@/lib/prisma";
import ProductList from "@/app/products/ProductList";
import { getDictionary, type Locale } from "@/lib/i18n";

export const metadata = {
  title: "Product index | Kbiz Price Hunter",
  description: "Browse public product pages with clean URLs and pricing notes.",
};

export const dynamic = "force-dynamic";

type ProductCard = {
  slug: string;
  name: string;
  summary: string;
  priceNote?: string;
  lastChecked?: string;
};

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const dict = getDictionary(normalizedLocale);
  const basePath = `/${normalizedLocale}`;


  const dbProducts = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  const currencyFormatter = new Intl.NumberFormat(normalizedLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const dateFormatter = new Intl.DateTimeFormat(normalizedLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const rangeLabel = normalizedLocale === "bg" ? "Среден диапазон" : "Avg range";
  const updatedLabel = normalizedLocale === "bg" ? "Обновено" : "Updated";

  const dbProductIds = dbProducts.map((product) => product.id);
  const priceAggregates = dbProductIds.length
    ? await prisma.price.groupBy({
        by: ["productId"],
        where: { productId: { in: dbProductIds } },
        _min: { amount: true },
        _max: { amount: true, recordedAt: true },
      })
    : [];

  const priceStats = new Map(
    priceAggregates.map((aggregate) => [aggregate.productId, aggregate])
  );

  const dbCards: ProductCard[] = dbProducts.map((product) => {
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
    };
  });

  const mergedProducts = dbCards.filter((product, index, all) => {
    return all.findIndex((item) => item.slug === product.slug) === index;
  });

  return (
    <main className="page-shell">
      <div className="container">
        <h1>{dict.products.title}</h1>
        <p className="pill" style={{ marginTop: 12 }}>
          {dict.products.subtitle}
        </p>
        <ProductList basePath={basePath} products={mergedProducts} />
      </div>
    </main>
  );
}
