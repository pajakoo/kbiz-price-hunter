import Link from "next/link";
import { notFound } from "next/navigation";
import ProductPriceChart from "@/app/products/ProductPriceChart";
import FavoriteAlertToggle from "@/app/products/FavoriteAlertToggle";
import ProductDeleteButton from "@/app/products/ProductDeleteButton";
import { prisma } from "@/lib/prisma";
import { getLocalizedProduct, getProduct } from "@/lib/products";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import { getLocaleAlternates } from "@/lib/seo";
import { getCategoryOptions } from "@/lib/product-categories";
import { latestStorePrices } from "@/lib/latest-store-prices";
import YogurtProfile, { yogurtSlug, yogurtDescription } from "@/app/products/YogurtProfile";
import StapleProfile from "@/app/products/StapleProfile";
import { getStapleProduct } from "@/lib/staple-profiles";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kbiz-price-hunter.example";

type PageProps = {
  params: Promise<{ slug: string; locale: string }>;
  searchParams?: Promise<{ sort?: string; city?: string }>;
};

export const dynamic = "force-dynamic";

type DisplayProduct = {
  slug: string;
  name: string;
  summary: string;
  priceNote: string;
  lastChecked: string;
  highlights: string[];
  categories: string[];
  productId?: string;
};

async function getDisplayProduct(
  slug: string,
  locale: Locale,
  dict: ReturnType<typeof getDictionary>
): Promise<DisplayProduct | null> {
  const dbProduct = await prisma.product.findUnique({ where: { slug } });
  const profile = getStapleProduct(slug);
  if (dbProduct) {
    return {
      slug: dbProduct.slug,
      name: profile?.name ?? dbProduct.name,
      summary: profile?.description[locale] ?? (dbProduct.description?.trim() || dict.product.fallbackSummary),
      priceNote: dict.product.fallbackPriceNote,
      lastChecked: dict.product.fallbackLastChecked,
      highlights: dict.product.fallbackHighlights,
      categories: dbProduct.categories,
      productId: dbProduct.id,
    };
  }

  if (profile) return { slug, name: profile.name, summary: profile.description[locale],
    priceNote: dict.product.noPrices, lastChecked: "—", highlights: [], categories: ["hrani"] };

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
    categories: [],
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

  const profile = getStapleProduct(slug);
  const description = profile?.description[normalizedLocale] ?? (slug === yogurtSlug ? yogurtDescription(normalizedLocale === "bg") :
    product.summary === dict.product.fallbackSummary
      ? normalizedLocale === "bg"
        ? `${product.name} - актуални цени и сравнение между магазини.`
        : `${product.name} with current prices and store comparison.`
      : product.summary);

  return {
    title: `${product.name}${profile ? (normalizedLocale === "bg" ? " – състав, магазини и цени" : " – ingredients, stores and prices") : ""} | Ловец на цени`,
    description,
    alternates: getLocaleAlternates(`/products/${slug}`, normalizedLocale),
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug, locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const dict = getDictionary(normalizedLocale);
  const basePath = `/${normalizedLocale}`;
  const sortParam = (await searchParams)?.sort ?? "price-asc";
  const sortKey = sortParam === "price-desc" ? "price-desc" : "price-asc";
  const city = (await searchParams)?.city ?? "";
  const bg = normalizedLocale === "bg";
  const profile = getStapleProduct(slug);
  const hasProfile = Boolean(profile) || slug === yogurtSlug;
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
  const storeLatest = latestStorePrices(priceSnapshots);

  storeLatest.forEach((price) => {
    minPrice = Math.min(minPrice, price.amount);
    maxPrice = Math.max(maxPrice, price.amount);
    totalPrice += price.amount;
  });

  const bestPrice = Number.isFinite(minPrice) ? minPrice : null;
  const avgPrice = storeLatest.size ? totalPrice / storeLatest.size : null;
  const lastUpdate = priceSnapshots[0]?.recordedAt ?? null;
  const priceNote =
    bestPrice !== null && Number.isFinite(maxPrice)
      ? `${rangeLabel}: ${currencyFormatter.format(bestPrice)} - ${currencyFormatter.format(
          maxPrice
        )} EUR`
      : dict.product.noPrices;
  const lastChecked = lastUpdate
    ? `${updatedLabel} ${dateFormatter.format(lastUpdate)}`
    : "—";
  const sortLowLabel = normalizedLocale === "bg" ? "Най-ниска цена" : "Lowest price";
  const sortHighLabel = normalizedLocale === "bg" ? "Най-висока цена" : "Highest price";
  const sortedStorePrices = Array.from(storeLatest.values()).sort((left, right) =>
    sortKey === "price-desc" ? right.amount - left.amount : left.amount - right.amount
  );
  const cheapestStore = sortedStorePrices.find((price) => price.amount === minPrice) ?? null;
  const cities = [...new Set(sortedStorePrices.map((price) => price.store.city).filter((value): value is string => Boolean(value)))].sort();
  const visibleStorePrices = city ? sortedStorePrices.filter((price) => price.store.city === city) : sortedStorePrices;
  const priciestStore = sortedStorePrices.find((price) => price.amount === maxPrice) ?? null;
  const categoryLabels = getCategoryOptions()
    .filter((category) => product.categories.includes(category.slug))
    .map((category) => category.label);
  const overviewTitle = normalizedLocale === "bg" ? "Преглед на продукта" : "Product overview";
  const marketTitle = normalizedLocale === "bg" ? "Пазарна снимка" : "Market snapshot";
  const categoryTitle = normalizedLocale === "bg" ? "Категории" : "Categories";
  const cheapestLabel = normalizedLocale === "bg" ? "Най-ниска последно отчетена цена" : "Lowest latest recorded price";
  const highestLabel = normalizedLocale === "bg" ? "Най-висока последно отчетена цена" : "Highest latest recorded price";
  const coverageLabel = normalizedLocale === "bg" ? "Покритие" : "Coverage";
  const noCategoryLabel = normalizedLocale === "bg" ? "Неопределени" : "Unassigned";
  const overviewText =
    bestPrice !== null && lastUpdate
      ? normalizedLocale === "bg"
        ? `${product.name} в момента се следи в ${storeLatest.size} магазина. Най-ниската отчетена цена е ${currencyFormatter.format(bestPrice)} EUR, а най-високата е ${currencyFormatter.format(maxPrice)} EUR към ${dateFormatter.format(lastUpdate)}.`
        : `${product.name} is currently tracked across ${storeLatest.size} stores. The lowest observed price is ${currencyFormatter.format(bestPrice)} EUR and the highest is ${currencyFormatter.format(maxPrice)} EUR as of ${dateFormatter.format(lastUpdate)}.`
      : product.summary;
  const marketText =
    cheapestStore && priciestStore
      ? normalizedLocale === "bg"
        ? `Сред последните записи по магазин най-ниската цена е в ${cheapestStore.store.name} на ${currencyFormatter.format(cheapestStore.amount)} EUR, а най-високата е в ${priciestStore.store.name} на ${currencyFormatter.format(priciestStore.amount)} EUR. Проверете датата на всеки запис; наличността не е потвърдена.`
        : `Among the latest records per store, the lowest price is at ${cheapestStore.store.name} for ${currencyFormatter.format(cheapestStore.amount)} EUR and the highest is at ${priciestStore.store.name} for ${currencyFormatter.format(priciestStore.amount)} EUR. Check each observation date; availability is not confirmed.`
      : normalizedLocale === "bg"
        ? "Ще покажем сравнение по магазини веднага щом има повече ценови данни."
        : "Store-level comparisons will appear here as more price observations are collected.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${baseUrl}/${normalizedLocale}/products/${slug}#product`,
    url: `${baseUrl}/${normalizedLocale}/products/${slug}`,
    name: product.name,
    description: product.summary,
    ...(profile ? { brand: { "@type": "Brand", name: profile.brand },
      ...(profile.gtin ? { gtin13: profile.gtin } : {}),
      ...(profile.unit === "kg" ? { weight: { "@type": "QuantitativeValue", value: profile.quantity * 1000, unitCode: "GRM" } } : {}) } : {}),
    // Recorded prices have no verified offer validity; retain Product metadata only.
  };

  return (
    <main className="page-shell" suppressHydrationWarning>
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
              {hasProfile ? product.summary : overviewText}
            </p>
          </div>
          {!hasProfile && <div className="product-hero-image" aria-hidden="true" />}
        </div>

        {hasProfile && <>
          <nav aria-label={bg ? "Навигация в каталога" : "Catalog navigation"} className="table-actions">
            <Link href={`${basePath}/products`}>{bg ? "Всички продукти" : "All products"}</Link>
            <Link href={`${basePath}/products/staples`}>{bg ? "Основни продукти — сравнение" : "Everyday staples — compare"}</Link>
            <Link href={`${basePath}/products/category/hrani`}>{bg ? "Храни" : "Food"}</Link>
            <a href="#store-comparison">{bg ? "Магазини и записани цени ↓" : "Stores and recorded prices ↓"}</a>
            <a href="#price-history">{bg ? "История на цените ↓" : "Price history ↓"}</a>
          </nav>
          {slug === yogurtSlug ? <YogurtProfile bg={bg} /> : profile && <StapleProfile profile={profile} bg={bg} />}
        </>}

        {!hasProfile && <section className="section">
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{overviewTitle}</h2>
              <p>{product.summary}</p>
            </div>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{marketTitle}</h2>
              <p>{marketText}</p>
            </div>
            <div className="card">
              <h2 style={{ marginTop: 0 }}>{categoryTitle}</h2>
              <p>{categoryLabels.length ? categoryLabels.join(", ") : noCategoryLabel}</p>
              <p style={{ color: "var(--ink-muted)" }}>
                {coverageLabel}: {storeLatest.size || 0} {normalizedLocale === "bg" ? "магазина" : "stores"}
              </p>
            </div>
          </div>
        </section>}

        <section className="section">
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <div className="card">
              <h3>{dict.product.snapshot}</h3>
              <p>{priceNote}</p>
              <p>{lastChecked}</p>
              {profile && <p>{bg
                ? "Обединени записи за една и съща марка, вариант и разфасовка. Съпоставянето е по търговско наименование; баркодът не е наличен във всеки източник."
                : "Combined records for the same brand, variant and pack size. Matching uses retailer names; not every source supplies a barcode."}</p>}
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
            {!hasProfile && <div className="card">
              <h3>{dict.product.track}</h3>
              <ul style={{ marginTop: 12, paddingLeft: 18, color: "var(--ink-muted)" }}>
                {product.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>}
            <div className="card">
              <h3>{dict.product.quickStats}</h3>
              <div className="stats-grid">
                <div>
                  <span className="stat-label">{cheapestLabel}</span>
                  <strong>
                    {bestPrice !== null ? `${currencyFormatter.format(bestPrice)} EUR` : "—"}
                  </strong>
                </div>
                <div>
                  <span className="stat-label">{dict.product.avgPrice}</span>
                  <strong>
                    {avgPrice !== null ? `${currencyFormatter.format(avgPrice)} EUR` : "—"}
                  </strong>
                </div>
                <div>
                  <span className="stat-label">{dict.product.storesTracked}</span>
                  <strong>{storeLatest.size || "—"}</strong>
                </div>
                <div>
                  <span className="stat-label">{dict.product.lastUpdate}</span>
                  <strong>{lastUpdate ? dateFormatter.format(lastUpdate) : "—"}</strong>
                </div>
                <div>
                  <span className="stat-label">{highestLabel}</span>
                  <strong>
                    {Number.isFinite(maxPrice) ? `${currencyFormatter.format(maxPrice)} EUR` : "—"}
                  </strong>
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
        <section className="section" id="price-history">
          <h2>{bg ? "История на цените" : "Price history"}</h2>
          <div className="card">
            {priceSnapshots.length ? <ProductPriceChart key={`${slug}:${city}`} slug={slug} city={city} locale={normalizedLocale} curated={Boolean(profile)} currencyLabel="EUR" /> : <p>{dict.product.noPrices}</p>}
          </div>
        </section>

        <section className="section" id="store-comparison">
          <h2>{bg ? "Къде е отчетен този продукт" : "Where this product was recorded"}</h2>
          <p>{bg ? "Магазини от нашите ценови записи. Датата е за конкретното наблюдение; тя не потвърждава наличност или днешна цена." : "Stores from our price records. Each date refers to an observation, not confirmed availability or today’s price."}</p>
          <p>{bg ? `Показани обекти: ${visibleStorePrices.length} от ${storeLatest.size}.` : `Showing ${visibleStorePrices.length} of ${storeLatest.size} locations.`}</p>
          <form method="get" action={`${basePath}/products/${slug}#store-comparison`} className="table-actions">
            <input type="hidden" name="sort" value={sortKey} />
            <label htmlFor="store-city">{bg ? "Град " : "City "}</label>
            <select id="store-city" name="city" defaultValue={city}>
              <option value="">{bg ? "Всички градове" : "All cities"}</option>
              {cities.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <button type="submit" className="button ghost">{bg ? "Покажи" : "Show"}</button>
          </form>
          <div className="table-actions">
            <Link
              className={
                sortKey === "price-asc" ? "filter-chip filter-chip--active" : "filter-chip"
              }
              href={`${basePath}/products/${slug}?${new URLSearchParams({ sort: "price-asc", ...(city ? { city } : {}) })}#store-comparison`}
            >
              {sortLowLabel}
            </Link>
            <Link
              className={
                sortKey === "price-desc" ? "filter-chip filter-chip--active" : "filter-chip"
              }
              href={`${basePath}/products/${slug}?${new URLSearchParams({ sort: "price-desc", ...(city ? { city } : {}) })}#store-comparison`}
            >
              {sortHighLabel}
            </Link>
          </div>
          <div className="card table-shell">
            <table className="price-table">
              <thead>
                <tr>
                  <th>{bg ? "Магазин / адрес" : "Store / address"}</th>
                  <th>{bg ? "Град" : "City"}</th>
                  <th>{profile ? (bg ? `Цена за опаковка / ${profile.unit === "kg" ? "кг" : "л"}` : `Pack price / ${profile.unit}`) : (bg ? "Цена" : "Price")}</th>
                  <th>{bg ? "Отчетено на" : "Observed on"}</th>
                </tr>
              </thead>
              <tbody>
                {visibleStorePrices.length ? (
                  visibleStorePrices.map((price) => (
                    <tr key={price.id}>
                       <td>{price.store.name}{profile && price.source && <small style={{ display: "block", color: "var(--ink-muted)" }}>{price.source.split("/").at(-1)?.replace(/\.csv$/i, "")}</small>}</td>
                      <td>{price.store.city || (bg ? "Неуточнен" : "Unspecified")}</td>
                       <td>{currencyFormatter.format(price.amount)} EUR{profile && <small style={{ display: "block" }}>{currencyFormatter.format(price.amount / profile.quantity)} EUR/{profile.unit}</small>}</td>
                      <td>{dateFormatter.format(price.recordedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                     <td colSpan={4}>{city ? (bg ? "Няма записани цени за избрания град. Изберете „Всички градове“." : "No recorded prices for this city. Select All cities.") : dict.product.noPrices}</td>
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
