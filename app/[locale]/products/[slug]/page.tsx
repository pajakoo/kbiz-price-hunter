import { notFound } from "next/navigation";
import ProductPriceChart from "@/app/products/ProductPriceChart";
import FavoriteAlertToggle from "@/app/products/FavoriteAlertToggle";
import { prisma } from "@/lib/prisma";
import { getLocalizedProduct, getProduct } from "@/lib/products";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getSession } from "@/lib/auth";

type PageProps = {
  params: Promise<{ slug: string; locale: string }>;
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
    return { title: "Product not found | Kbiz Price Hunter" };
  }

  return {
    title: `${product.name} | Kbiz Price Hunter`,
    description: product.summary,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug, locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const dict = getDictionary(normalizedLocale);
  const product = await getDisplayProduct(slug, normalizedLocale, dict);
  if (!product) {
    notFound();
  }
  const session = await getSession();
  const basePath = `/${normalizedLocale}`;
  const subscription =
    session && product.productId
      ? await prisma.priceAlertSubscription.findUnique({
          where: { userId_productId: { userId: session.user.id, productId: product.productId } },
        })
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.summary,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: "9.00",
      highPrice: "24.00",
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
              <p>{product.priceNote}</p>
              <p>{product.lastChecked}</p>
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
                  <strong>9.40 EUR</strong>
                </div>
                <div>
                  <span className="stat-label">Avg price</span>
                  <strong>14.80 EUR</strong>
                </div>
                <div>
                  <span className="stat-label">Stores tracked</span>
                  <strong>6</strong>
                </div>
                <div>
                  <span className="stat-label">Last update</span>
                  <strong>Today</strong>
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
                <tr>
                  <td>Fresh Mart</td>
                  <td>1L bottle</td>
                  <td>9.40 EUR</td>
                  <td>2h ago</td>
                </tr>
                <tr>
                  <td>Market One</td>
                  <td>1L bottle</td>
                  <td>10.10 EUR</td>
                  <td>Yesterday</td>
                </tr>
                <tr>
                  <td>SuperBox</td>
                  <td>750ml bottle</td>
                  <td>8.90 EUR</td>
                  <td>3 days ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
