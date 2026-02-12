"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ProductCard = {
  slug: string;
  name: string;
  summary: string;
  priceNote?: string;
  lastChecked?: string;
};

type CategoryConfig = {
  label: string;
  keywords: string[];
};

const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    label: "Лекарства",
    keywords: ["спрей", "таблетки", "капсули", "гел", "крем", "сироп", "унгв"],
  },
  {
    label: "Храни",
    keywords: ["сирене", "мляко", "месо", "хляб", "масло"],
  },
  {
    label: "Напитки",
    keywords: ["чай", "кафе", "сок", "вода"],
  },
  {
    label: "Козметика",
    keywords: ["шампоан", "лосион", "крем", "балсам"],
  },
  {
    label: "Домакинство",
    keywords: ["препарат", "почист", "прах"],
  },
];

type CategorizedProduct = ProductCard & {
  categories: string[];
};

type Props = {
  basePath: string;
  products: ProductCard[];
};

function getCategories(name: string) {
  const normalized = name.toLowerCase();
  return CATEGORY_CONFIG.filter((category) =>
    category.keywords.some((keyword) => normalized.includes(keyword))
  ).map((category) => category.label);
}

export default function ProductList({ basePath, products }: Props) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categorizedProducts = useMemo<CategorizedProduct[]>(
    () =>
      products.map((product) => ({
        ...product,
        categories: getCategories(product.name),
      })),
    [products]
  );

  const availableCategories = useMemo(() => {
    const unique = new Set<string>();
    categorizedProducts.forEach((product) => {
      product.categories.forEach((category) => unique.add(category));
    });
    return Array.from(unique);
  }, [categorizedProducts]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategories.length) {
      return categorizedProducts;
    }

    return categorizedProducts.filter((product) =>
      selectedCategories.every((category) => product.categories.includes(category))
    );
  }, [categorizedProducts, selectedCategories]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const clearFilters = () => setSelectedCategories([]);

  return (
    <div>
      <div className="category-filters">
        {availableCategories.map((category) => {
          const isActive = selectedCategories.includes(category);
          return (
            <button
              key={category}
              type="button"
              className={isActive ? "filter-chip filter-chip--active" : "filter-chip"}
              onClick={() => toggleCategory(category)}
            >
              {category}
            </button>
          );
        })}
        {availableCategories.length ? (
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
            All
          </button>
        ) : null}
      </div>
      <div className="section product-grid">
        {filteredProducts.map((product) => (
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
  );
}
