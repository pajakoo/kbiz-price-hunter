"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ProductDeleteButton from "@/app/products/ProductDeleteButton";
import type { CategoryOption } from "@/lib/product-categories";
import type { ProductCard } from "@/lib/product-list";

const DEFAULT_QUERY = "";

type Props = {
  basePath: string;
  locale: "en" | "bg";
  initialProducts: ProductCard[];
  initialTotal: number;
  pageSize: number;
  categoryOptions: Array<Pick<CategoryOption, "slug" | "label">>;
  isAdmin?: boolean;
  deleteLabel?: string;
  deleteConfirm?: string;
  deleteSuccess?: string;
  deleteError?: string;
  initialQuery?: string;
  initialCategories?: string[];
};

type ProductsResponse = {
  ok: boolean;
  products: ProductCard[];
  total: number;
  page: number;
  pageSize: number;
};

export default function ProductList({
  basePath,
  locale,
  initialProducts,
  initialTotal,
  pageSize,
  categoryOptions,
  isAdmin = false,
  deleteLabel = "",
  deleteConfirm = "",
  deleteSuccess = "",
  deleteError = "",
  initialQuery = DEFAULT_QUERY,
  initialCategories = [],
}: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = products.length < total;

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("pageSize", String(pageSize));
    params.set("locale", locale);
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (selectedCategories.length) {
      params.set("categories", selectedCategories.join(","));
    }
    return params;
  }, [pageSize, locale, query, selectedCategories]);

  const filterKey = filterParams.toString();

  const loadPage = async (nextPage: number, replace: boolean) => {
    const params = new URLSearchParams(filterParams);
    params.set("page", String(nextPage));

    replace ? setLoading(true) : setLoadingMore(true);

    try {
      const response = await fetch(`/api/products?${params.toString()}`);
      const payload = (await response.json()) as ProductsResponse;

      if (!response.ok || !payload.ok) {
        throw new Error("Failed to load products");
      }

      setProducts((current) => (replace ? payload.products : [...current, ...payload.products]));
      setTotal(payload.total);
      setPage(payload.page);
    } catch (error) {
      console.error("Product list load failed", error);
      if (replace) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadPage(1, true);
  }, [filterKey]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore && !loading) {
          loadPage(page + 1, false);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, filterKey]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const clearFilters = () => setSelectedCategories([]);

  const allLabel = locale === "bg" ? "Всички" : "All";
  const loadingLabel = locale === "bg" ? "Зареждане..." : "Loading...";
  const loadingMoreLabel = locale === "bg" ? "Още резултати..." : "Loading more...";
  const emptyLabel = locale === "bg" ? "Няма намерени продукти." : "No products found.";

  return (
    <div>
      <div className="category-filters">
        {categoryOptions.map((category) => {
          const isActive = selectedCategories.includes(category.slug);
          return (
            <button
              key={category.slug}
              type="button"
              className={isActive ? "filter-chip filter-chip--active" : "filter-chip"}
              onClick={() => toggleCategory(category.slug)}
            >
              {category.label}
            </button>
          );
        })}
        <button
          type="button"
          className={
            selectedCategories.length
              ? "filter-chip filter-chip--clear"
              : "filter-chip filter-chip--clear filter-chip--disabled"
          }
          onClick={clearFilters}
          disabled={!selectedCategories.length}
        >
          {allLabel}
        </button>
      </div>
      <div className="product-search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === "bg" ? "Търсене по име или описание" : "Search by name or description"}
        />
      </div>
      {loading ? (
        <p style={{ marginTop: 16, color: "var(--ink-muted)" }}>{loadingLabel}</p>
      ) : products.length ? (
        <div className="section product-grid">
          {products.map((product) => (
            <div key={product.slug} className="product-card">
              <Link className="product-card__link" href={`${basePath}/products/${product.slug}`}>
                <h3>{product.name}</h3>
                <p>{product.summary}</p>
                {product.priceNote ? <span>{product.priceNote}</span> : null}
                {product.lastChecked ? <span>{product.lastChecked}</span> : null}
              </Link>
              {isAdmin ? (
                <ProductDeleteButton
                  slug={product.slug}
                  basePath={basePath}
                  label={deleteLabel}
                  confirmLabel={deleteConfirm}
                  successLabel={deleteSuccess}
                  errorLabel={deleteError}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ marginTop: 16, color: "var(--ink-muted)" }}>{emptyLabel}</p>
      )}
      <div ref={sentinelRef} />
      {loadingMore ? (
        <p style={{ marginTop: 12, color: "var(--ink-muted)" }}>{loadingMoreLabel}</p>
      ) : null}
    </div>
  );
}
