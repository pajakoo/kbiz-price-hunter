import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLocalizedProduct, products } from "@/lib/products";
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

  const staticProducts: ProductCard[] = products.map((product) => {
    const localized = getLocalizedProduct(product, normalizedLocale);
    return {
      slug: localized.slug,
      name: localized.name,
      summary: localized.summary,
      priceNote: localized.priceNote,
      lastChecked: localized.lastChecked,
    };
  });

  const dbProducts = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  const dbCards: ProductCard[] = dbProducts.map((product) => ({
    slug: product.slug,
    name: product.name,
    summary: product.description?.trim() || dict.products.fallbackSummary,
    priceNote: dict.products.fallbackPriceNote,
    lastChecked: dict.products.fallbackLastChecked,
  }));

  const mergedProducts = [...dbCards, ...staticProducts].filter((product, index, all) => {
    return all.findIndex((item) => item.slug === product.slug) === index;
  });

  return (
    <main className="page-shell">
      <div className="container">
        <h1>{dict.products.title}</h1>
        <p className="pill" style={{ marginTop: 12 }}>
          {dict.products.subtitle}
        </p>
        <div className="section product-grid">
          {mergedProducts.map((product) => (
            <Link
              key={product.slug}
              href={`${basePath}/products/${product.slug}`}
              className="product-card"
            >
              <h3>{product.name}</h3>
              <p>{product.summary}</p>
              {product.priceNote ? <span>{product.priceNote}</span> : null}
              {product.lastChecked ? <span>{product.lastChecked}</span> : null}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
