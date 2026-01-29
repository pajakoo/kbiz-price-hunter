"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type PricePoint = {
  date: string;
  price: number;
};

type StoreSeries = {
  store: string;
  points: PricePoint[];
};

type ProductHistory = {
  product: string;
  series: StoreSeries[];
};

const SAMPLE_HISTORY: ProductHistory[] = [
  {
    product: "Extra Virgin Olive Oil",
    series: [
      {
        store: "Market One",
        points: [
          { date: "2024-10-01", price: 22.4 },
          { date: "2024-10-10", price: 21.9 },
          { date: "2024-10-20", price: 20.2 },
          { date: "2024-11-01", price: 19.8 },
        ],
      },
      {
        store: "Fresh Mart",
        points: [
          { date: "2024-10-01", price: 23.1 },
          { date: "2024-10-10", price: 22.5 },
          { date: "2024-10-20", price: 21.7 },
          { date: "2024-11-01", price: 21.1 },
        ],
      },
    ],
  },
  {
    product: "Coffee Beans",
    series: [
      {
        store: "Market One",
        points: [
          { date: "2024-10-03", price: 18.1 },
          { date: "2024-10-12", price: 17.7 },
          { date: "2024-10-24", price: 16.9 },
          { date: "2024-11-04", price: 16.4 },
        ],
      },
      {
        store: "Fresh Mart",
        points: [
          { date: "2024-10-03", price: 19.2 },
          { date: "2024-10-12", price: 18.6 },
          { date: "2024-10-24", price: 17.8 },
          { date: "2024-11-04", price: 17.2 },
        ],
      },
    ],
  },
];

type Props = {
  productLabel: string;
  storeLabel: string;
  allStoresLabel: string;
  currencyLabel: string;
  emptyStateLabel: string;
  extraProducts?: string[];
};

export default function PriceChart({
  productLabel,
  storeLabel,
  allStoresLabel,
  currencyLabel,
  emptyStateLabel,
  extraProducts = [],
}: Props) {
  const productOptions = useMemo(() => {
    const existing = new Map(SAMPLE_HISTORY.map((item) => [item.product, item]));
    const extras = extraProducts
      .filter((name) => name && !existing.has(name))
      .map((name) => ({
        product: name,
        series: [
          {
            store: "Market One",
            points: [
              { date: "2024-10-05", price: 11.2 },
              { date: "2024-10-15", price: 10.7 },
              { date: "2024-10-25", price: 10.1 },
              { date: "2024-11-05", price: 9.8 },
            ],
          },
          {
            store: "Fresh Mart",
            points: [
              { date: "2024-10-05", price: 11.9 },
              { date: "2024-10-15", price: 11.3 },
              { date: "2024-10-25", price: 10.9 },
              { date: "2024-11-05", price: 10.4 },
            ],
          },
        ],
      }));
    return [...SAMPLE_HISTORY, ...extras];
  }, [extraProducts]);

  const [product, setProduct] = useState(productOptions[0]);
  const [storeFilter, setStoreFilter] = useState("all");

  useEffect(() => {
    if (!productOptions.find((item) => item.product === product.product)) {
      setProduct(productOptions[0]);
      setStoreFilter("all");
    }
  }, [productOptions, product.product]);

  const storeOptions = useMemo(() => {
    const stores = new Set<string>();
    product.series.forEach((series) => stores.add(series.store));
    return ["all", ...Array.from(stores)];
  }, [product]);

  const chartData = useMemo(() => {
    const filteredSeries =
      storeFilter === "all"
        ? product.series
        : product.series.filter((series) => series.store === storeFilter);

    const labels = Array.from(
      new Set(filteredSeries.flatMap((series) => series.points.map((point) => point.date)))
    ).sort();

    const datasets = filteredSeries.map((series, index) => ({
      label: series.store,
      data: labels.map((label) => {
        const point = series.points.find((p) => p.date === label);
        return point ? point.price : null;
      }),
      borderColor: index === 0 ? "#d46627" : "#1f3b2c",
      backgroundColor: "rgba(212, 102, 39, 0.2)",
      spanGaps: true,
      tension: 0.3,
    }));

    return { labels, datasets };
  }, [product, storeFilter]);

  return (
    <section className="section">
      <div className="card">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
          <div>
            <label htmlFor="product-select">{productLabel}</label>
            <select
              id="product-select"
              value={product.product}
              onChange={(event) => {
                const selected = productOptions.find(
                  (item) => item.product === event.target.value
                );
                if (selected) {
                  setProduct(selected);
                  setStoreFilter("all");
                }
              }}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)" }}
            >
              {productOptions.map((item) => (
                <option key={item.product} value={item.product}>
                  {item.product}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="store-select">{storeLabel}</label>
            <select
              id="store-select"
              value={storeFilter}
              onChange={(event) => setStoreFilter(event.target.value)}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)" }}
            >
              {storeOptions.map((store) => (
                <option key={store} value={store}>
                  {store === "all" ? allStoresLabel : store}
                </option>
              ))}
            </select>
          </div>
        </div>
        {product.series.length === 0 ? (
          <p style={{ marginTop: 12, color: "var(--ink-muted)" }}>{emptyStateLabel}</p>
        ) : (
          <Line
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "top" },
              },
              scales: {
                y: {
                  ticks: {
                    callback: (value) => `${value} ${currencyLabel}`,
                  },
                },
              },
            }}
          />
        )}
      </div>
    </section>
  );
}
