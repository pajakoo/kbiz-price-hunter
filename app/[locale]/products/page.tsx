import ProductList from "@/app/products/ProductList";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getCategoryOptions } from "@/lib/product-categories";
import { getProductCards } from "@/lib/product-list";

export const metadata = {
  title: "Product index | Kbiz Price Hunter",
  description: "Browse public product pages with clean URLs and pricing notes.",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const dict = getDictionary(normalizedLocale);
  const basePath = `/${normalizedLocale}`;
  const pageSize = 30;

  const { products: initialProducts, total } = await getProductCards({
    locale: normalizedLocale,
    page: 1,
    pageSize,
  });

  const mergedProducts = initialProducts.filter((product, index, all) => {
    return all.findIndex((item) => item.slug === product.slug) === index;
  });

  return (
    <main className="page-shell">
      <div className="container">
        <h1>{dict.products.title}</h1>
        <p className="pill" style={{ marginTop: 12 }}>
          {dict.products.subtitle}
        </p>
        <ProductList
          basePath={basePath}
          locale={normalizedLocale}
          initialProducts={mergedProducts}
          initialTotal={total}
          pageSize={pageSize}
          categoryOptions={getCategoryOptions()}
        />
      </div>
    </main>
  );
}
