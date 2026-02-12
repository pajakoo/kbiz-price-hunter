import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PriceChart from "@/app/dashboard/PriceChart";
import ProductCreateForm from "@/app/dashboard/ProductCreateForm";
import CsvImportForm from "@/app/dashboard/CsvImportForm";
import PriceAlertManager from "@/app/dashboard/PriceAlertManager";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";

export const metadata = {
  title: "Dashboard | Kbiz Price Hunter",
  description: "Private pricing workspace for lists and store comparisons.",
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const session = await getSession();
  const dict = getDictionary(normalizedLocale);
  const basePath = `/${normalizedLocale}`;

  if (!session) {
    redirect(`${basePath}/login`);
  }

  const recentProducts = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const chartProducts = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    select: { name: true, slug: true },
  });

  const alertProducts = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const alertSubscriptions = await prisma.priceAlertSubscription.findMany({
    where: { userId: session.user.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const alertNotifications = await prisma.priceAlertNotification.findMany({
    where: { userId: session.user.id },
    include: { product: true, store: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const priceSnapshots = await prisma.price.findMany({
    orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
    include: { product: true, store: true },
    take: 2000,
  });

  const grouped = new Map<string, typeof priceSnapshots>();
  const drops: {
    productId: string;
    productSlug: string;
    productName: string;
    storeName: string;
    from: number;
    to: number;
    delta: number;
    date: string;
  }[] = [];

  priceSnapshots.forEach((price) => {
    const key = `${price.productId}:${price.storeId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(price);
    } else {
      grouped.set(key, [price]);
    }
  });

  grouped.forEach((prices) => {
    const sorted = prices
      .slice()
      .sort((a, b) =>
        a.recordedAt.getTime() === b.recordedAt.getTime()
          ? a.id.localeCompare(b.id)
          : a.recordedAt.getTime() - b.recordedAt.getTime()
      );

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (current.amount >= previous.amount) {
        continue;
      }

      drops.push({
        productId: current.productId,
        productSlug: current.product.slug,
        productName: current.product.name,
        storeName: current.store.name,
        from: previous.amount,
        to: current.amount,
        delta: Number((previous.amount - current.amount).toFixed(2)),
        date: current.recordedAt.toISOString().slice(0, 10),
      });
    }
  });

  const priceDrops = drops.sort((a, b) => b.delta - a.delta).slice(0, 8);
  const currencyFormatter = new Intl.NumberFormat(normalizedLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedSubscriptions = alertSubscriptions.map(
    (subscription: {
      id: string;
      productId: string;
      product: { name: string; slug: string };
    }) => ({
      id: subscription.id,
      productId: subscription.productId,
      productName: subscription.product.name,
      productSlug: subscription.product.slug,
    })
  );

  const formattedNotifications = alertNotifications.map(
    (notification: {
      id: string;
      product: { name: string; slug: string };
      store: { name: string };
      fromAmount: number;
      toAmount: number;
      currency: string;
      recordedAt: Date;
    }) => ({
      id: notification.id,
      productName: notification.product.name,
      productSlug: notification.product.slug,
      storeName: notification.store.name,
      fromAmount: notification.fromAmount,
      toAmount: notification.toAmount,
      currency: notification.currency,
      recordedAt: notification.recordedAt.toISOString().slice(0, 10),
    })
  );

  return (
    <main className="page-shell">
      <div className="container">
        <h1>{dict.dashboard.title}</h1>
        <p style={{ marginTop: 12, color: "var(--ink-muted)" }}>
          {dict.dashboard.welcomeLine.replace("{email}", session.user.email)}
        </p>
        <div
          className="section grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
        >
          <div className="card">
            <h3>{dict.dashboard.lists}</h3>
            <p>{dict.dashboard.listsBody}</p>
          </div>
          <div className="card">
            <h3>{dict.dashboard.stores}</h3>
            <p>{dict.dashboard.storesBody}</p>
          </div>
          <div className="card">
            <h3>{dict.dashboard.alerts}</h3>
            <p>{dict.dashboard.alertsBody}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="button ghost" href={`${basePath}/products`}>
            {dict.dashboard.browse}
          </Link>
          <form action="/api/auth/logout" method="post">
            <button className="button" type="submit">
              {dict.dashboard.logout}
            </button>
          </form>
        </div>
        <ProductCreateForm
          title={dict.dashboard.createProductTitle}
          body={dict.dashboard.createProductBody}
          slugLabel={dict.dashboard.createProductSlugLabel}
          nameLabel={dict.dashboard.createProductNameLabel}
          descriptionLabel={dict.dashboard.createProductDescriptionLabel}
          slugPlaceholder={dict.dashboard.createProductSlugPlaceholder}
          namePlaceholder={dict.dashboard.createProductNamePlaceholder}
          descriptionPlaceholder={dict.dashboard.createProductDescriptionPlaceholder}
          submitLabel={dict.dashboard.createProductSubmit}
          submittingLabel={dict.dashboard.createProductSubmitting}
          successMessage={dict.dashboard.createProductSuccess}
          errorMessage={dict.dashboard.createProductError}
        />
        <CsvImportForm
          title={dict.dashboard.importCsvTitle}
          body={dict.dashboard.importCsvBody}
          fileLabel={dict.dashboard.importCsvFileLabel}
          dateLabel={dict.dashboard.importCsvDateLabel}
          dateHelp={dict.dashboard.importCsvDateHelp}
          submitLabel={dict.dashboard.importCsvSubmit}
          submittingLabel={dict.dashboard.importCsvSubmitting}
          successMessage={dict.dashboard.importCsvSuccess}
          errorMessage={dict.dashboard.importCsvError}
        />
        <section className="section">
          <div className="card">
            <h2>{dict.dashboard.recentProductsTitle}</h2>
            <p style={{ marginTop: 8, color: "var(--ink-muted)" }}>
              {dict.dashboard.recentProductsBody}
            </p>
            {recentProducts.length ? (
              <ul style={{ marginTop: 16, paddingLeft: 18, color: "var(--ink-muted)" }}>
                {recentProducts.map((product) => (
                  <li key={product.id}>
                    <Link href={`${basePath}/products/${product.slug}`}>{product.name}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ marginTop: 16, color: "var(--ink-muted)" }}>
                {dict.dashboard.recentProductsEmpty}
              </p>
            )}
          </div>
        </section>
        <PriceAlertManager
          title={dict.dashboard.priceAlertsTitle}
          body={dict.dashboard.priceAlertsBody}
          productLabel={dict.dashboard.priceAlertsProductLabel}
          submitLabel={dict.dashboard.priceAlertsSubmit}
          submittingLabel={dict.dashboard.priceAlertsSubmitting}
          removeLabel={dict.dashboard.priceAlertsRemove}
          emptyLabel={dict.dashboard.priceAlertsEmpty}
          statusAdded={dict.dashboard.priceAlertsStatusAdded}
          statusError={dict.dashboard.priceAlertsStatusError}
          notificationsTitle={dict.dashboard.priceAlertsNotificationsTitle}
          notificationsEmpty={dict.dashboard.priceAlertsNotificationsEmpty}
          basePath={basePath}
          locale={normalizedLocale}
          currencyLabel="EUR"
          products={alertProducts}
          subscriptions={formattedSubscriptions}
          notifications={formattedNotifications}
        />
        <section className="section">
          <div className="card">
            <h2>{dict.dashboard.priceDropsTitle}</h2>
            <p style={{ marginTop: 8, color: "var(--ink-muted)" }}>
              {dict.dashboard.priceDropsBody}
            </p>
            {priceDrops.length ? (
              <ul style={{ marginTop: 16, paddingLeft: 18, color: "var(--ink-muted)" }}>
                {priceDrops.map((drop, index) => (
                  <li key={`${drop.productId}-${drop.storeName}-${index}`}>
                    <Link href={`${basePath}/products/${drop.productSlug}`}>
                      <strong>{drop.productName}</strong>
                    </Link>
                    {` · ${drop.storeName} · ${currencyFormatter.format(drop.from)} → ${currencyFormatter.format(
                      drop.to
                    )} EUR (-${currencyFormatter.format(drop.delta)} EUR) · ${drop.date}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ marginTop: 16, color: "var(--ink-muted)" }}>
                {dict.dashboard.priceDropsEmpty}
              </p>
            )}
          </div>
        </section>
        <PriceChart
          productLabel={dict.chart.product}
          storeLabel={dict.chart.store}
          cityLabel={dict.chart.city}
          allStoresLabel={dict.chart.allStores}
          allCitiesLabel={dict.chart.allCities}
          currencyLabel="EUR"
          emptyStateLabel={dict.chart.empty}
          loadingLabel={dict.chart.loading}
          extraProducts={chartProducts}
        />
      </div>
    </main>
  );
}
