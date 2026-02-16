import Link from "next/link";
import { notFound } from "next/navigation";
import ProductPriceChart from "@/app/products/ProductPriceChart";
import FavoriteAlertToggle from "@/app/products/FavoriteAlertToggle";
import ProductDeleteButton from "@/app/products/ProductDeleteButton";
import { prisma } from "@/lib/prisma";
import { getLocalizedProduct, getProduct } from "@/lib/products";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getSession } from "@/lib/auth";

type PageProps = {
  params: Promise<{ slug: string; locale: string }>;
  searchParams?: Promise<{ sort?: string }>;
};

export const dynamic = "force-dynamic";

type DisplayProduct = {
  slug: string;
  name: string;
  summary: string;
  priceNote: string;
  lastChecked: string;
  highlights: string[];
  productId?: string;
};

async function getDisplayProduct(
  slug: string,
  locale: Locale,
  dict: ReturnType<typeof getDictionary>
): Promise<DisplayProduct | null> {
  const dbProduct = await prisma.product.findUnique({ where: { slug } });
  if (dbProduct) {
    return {
      slug: dbProduct.slug,
      name: dbProduct.name,
      summary: dbProduct.description?.trim() || dict.product.fallbackSummary,
      priceNote: dict.product.fallbackPriceNote,
      lastChecked: dict.product.fallbackLastChecked,
      highlights: dict.product.fallbackHighlights,
      productId: dbProduct.id,
    };
  }

  const product = getProduct(slug);
  if (!product) {
    return null;
  }
  const localized = getLocalizedProduct(product, locale);
  return {
    slug: localized.slug,
    name: localized.name,
    summary: localized.summary,
    priceNote: localized.priceNote,
    lastChecked: localized.lastChecked,
    highlights: localized.highlights,
  };
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const dict = getDictionary(normalizedLocale);
  const product = await getDisplayProduct(slug, normalizedLocale, dict);
  if (!product) {
    return { title: "Product not found | Ловец на цени" };
  }

  return {
    title: `${product.name} | Ловец на цени`,
    description: product.summary,
    alternates: {
      canonical: `/${normalizedLocale}/products/${slug}`,
    },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug, locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const dict = getDictionary(normalizedLocale);
  const basePath = `/${normalizedLocale}`;
  const sortParam = (await searchParams)?.sort ?? "price-asc";
  const sortKey = sortParam === "price-desc" ? "price-desc" : "price-asc";
  const product = await getDisplayProduct(slug, normalizedLocale, dict);
  if (!product) {
    notFound();
  }
  const session = await getSession();

  const subscription =
    session && product.productId
      ? await prisma.priceAlertSubscription.findUnique({
          where: { userId_productId: { userId: session.user.id, productId: product.productId } },
        })
      : null;

  const priceSnapshots = product.productId
    ? await prisma.price.findMany({
        where: { productId: product.productId },
        include: { store: true },
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
      })
    : [];

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

  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = Number.NEGATIVE_INFINITY;
  let totalPrice = 0;
  const storeLatest = new Map<string, (typeof priceSnapshots)[number]>();

  priceSnapshots.forEach((price) => {
    minPrice = Math.min(minPrice, price.amount);
    maxPrice = Math.max(maxPrice, price.amount);
    totalPrice += price.amount;
    if (!storeLatest.has(price.storeId)) {
      storeLatest.set(price.storeId, price);
    }
  });

  const bestPrice = Number.isFinite(minPrice) ? minPrice : null;
  const avgPrice = priceSnapshots.length ? totalPrice / priceSnapshots.length : null;
  const lastUpdate = priceSnapshots[0]?.recordedAt ?? null;
  const priceNote =
    bestPrice !== null && Number.isFinite(maxPrice)
      ? `${rangeLabel}: ${currencyFormatter.format(bestPrice)} - ${currencyFormatter.format(
          maxPrice
        )} EUR`
      : product.priceNote;
  const lastChecked = lastUpdate
    ? `${updatedLabel} ${dateFormatter.format(lastUpdate)}`
    : product.lastChecked;
  const sortLowLabel = normalizedLocale === "bg" ? "Най-ниска цена" : "Lowest price";
  const sortHighLabel = normalizedLocale === "bg" ? "Най-висока цена" : "Highest price";
  const sortedStorePrices = Array.from(storeLatest.values()).sort((left, right) =>
    sortKey === "price-desc" ? right.amount - left.amount : left.amount - right.amount
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.summary,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: bestPrice !== null ? bestPrice.toFixed(2) : "9.00",
      highPrice: Number.isFinite(maxPrice) ? maxPrice.toFixed(2) : "24.00",
    },
  };

  return (
    <main className="page-shell">
      <div className="container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <span className="pill">{dict.product.publicTag}</span>
        <div className="product-hero">
          <div>
            <h1 style={{ marginTop: 16 }}>{product.name}</h1>
            <p style={{ marginTop: 12, color: "var(--ink-muted)" }}>
              {product.summary}
            </p>
          </div>
          <div className="product-hero-image" aria-hidden="true" />
        </div>

        <section className="section">
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <div className="card">
              <h3>{dict.product.snapshot}</h3>
              <p>{priceNote}</p>
              <p>{lastChecked}</p>
              {session?.user.email === "pajakoo@abv.bg" ? (
                <ProductDeleteButton
                  slug={slug}
                  basePath={basePath}
                  label={dict.product.deleteProduct}
                  confirmLabel={dict.product.deleteProductConfirm}
                  successLabel={dict.product.deleteProductSuccess}
                  errorLabel={dict.product.deleteProductError}
                />
              ) : null}
            </div>
            <div className="card">
              <h3>{dict.product.track}</h3>
              <ul style={{ marginTop: 12, paddingLeft: 18, color: "var(--ink-muted)" }}>
                {product.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3>Quick stats</h3>
              <div className="stats-grid">
                <div>
                  <span className="stat-label">Best price</span>
                  <strong>
                    {bestPrice !== null ? `${currencyFormatter.format(bestPrice)} EUR` : "—"}
                  </strong>
                </div>
                <div>
                  <span className="stat-label">Avg price</span>
                  <strong>
                    {avgPrice !== null ? `${currencyFormatter.format(avgPrice)} EUR` : "—"}
                  </strong>
                </div>
                <div>
                  <span className="stat-label">Stores tracked</span>
                  <strong>{storeLatest.size || "—"}</strong>
                </div>
                <div>
                  <span className="stat-label">Last update</span>
                  <strong>{lastUpdate ? dateFormatter.format(lastUpdate) : "—"}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {product.productId ? (
          <FavoriteAlertToggle
            productId={product.productId}
            isAuthenticated={Boolean(session)}
            isSubscribed={Boolean(subscription)}
            loginHref={`${basePath}/login`}
            title={dict.product.alertTitle}
            body={dict.product.alertBody}
            enableLabel={dict.product.alertEnable}
            disableLabel={dict.product.alertDisable}
            loginLabel={dict.product.alertLogin}
            successEnabled={dict.product.alertEnabled}
            successDisabled={dict.product.alertDisabled}
            errorLabel={dict.product.alertError}
          />
        ) : null}
        <section className="section">
          <h2>Price history</h2>
          <div className="card">
            <ProductPriceChart slug={slug} currencyLabel="EUR" />
          </div>
        </section>

        <section className="section">
          <h2>Store comparison</h2>
          <div className="table-actions">
            <Link
              className={
                sortKey === "price-asc" ? "filter-chip filter-chip--active" : "filter-chip"
              }
              href={`${basePath}/products/${slug}?sort=price-asc`}
            >
              {sortLowLabel}
            </Link>
            <Link
              className={
                sortKey === "price-desc" ? "filter-chip filter-chip--active" : "filter-chip"
              }
              href={`${basePath}/products/${slug}?sort=price-desc`}
            >
              {sortHighLabel}
            </Link>
          </div>
          <div className="card table-shell">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Package</th>
                  <th>Price</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {storeLatest.size ? (
                  sortedStorePrices.map((price) => (
                    <tr key={price.id}>
                      <td>{price.store.name}</td>
                      <td>—</td>
                      <td>{currencyFormatter.format(price.amount)} EUR</td>
                      <td>{dateFormatter.format(price.recordedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>{dict.product.noPrices}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}
