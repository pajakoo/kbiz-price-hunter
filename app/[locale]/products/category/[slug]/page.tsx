import { notFound } from "next/navigation";
import ProductList from "@/app/products/ProductList";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getCategoryOptions } from "@/lib/product-categories";
import { getProductCards } from "@/lib/product-list";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<{ q?: string }>;
};

function findCategory(slug: string) {
  return getCategoryOptions().find((category) => category.slug === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const category = findCategory(slug);

  if (!category) {
    return { title: "Category not found | Kbiz Price Hunter" };
  }

  return {
    title: `${category.label} | Kbiz Price Hunter`,
    description:
      normalizedLocale === "bg"
        ? `Категория ${category.label} с актуални цени.`
        : `Category ${category.label} with current prices.`,
    alternates: {
      canonical: `/${normalizedLocale}/products/category/${slug}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug, locale } = await params;
  const normalizedLocale: Locale = locale === "bg" ? "bg" : "en";
  const dict = getDictionary(normalizedLocale);
  const basePath = `/${normalizedLocale}`;
  const category = findCategory(slug);

  if (!category) {
    notFound();
  }

  const query = (await searchParams)?.q ?? "";
  const { products: initialProducts, total } = await getProductCards({
    locale: normalizedLocale,
    page: 1,
    pageSize: PAGE_SIZE,
    query,
    categories: [slug],
  });

  return (
    <main className="page-shell">
      <div className="container">
        <h1>{category.label}</h1>
        <p className="pill" style={{ marginTop: 12 }}>
          {dict.products.subtitle}
        </p>
        <ProductList
          basePath={basePath}
          locale={normalizedLocale}
          initialProducts={initialProducts}
          initialTotal={total}
          pageSize={PAGE_SIZE}
          categoryOptions={getCategoryOptions()}
          initialQuery={query}
          initialCategories={[slug]}
        />
      </div>
    </main>
  );
}
