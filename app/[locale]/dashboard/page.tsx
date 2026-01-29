import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PriceChart from "@/app/dashboard/PriceChart";
import ProductCreateForm from "@/app/dashboard/ProductCreateForm";
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
    select: { name: true },
  });

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
        <PriceChart
          productLabel={dict.chart.product}
          storeLabel={dict.chart.store}
          allStoresLabel={dict.chart.allStores}
          currencyLabel="EUR"
          emptyStateLabel={dict.chart.empty}
          extraProducts={chartProducts.map((product) => product.name)}
        />
      </div>
    </main>
  );
}
