"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type ChartProduct = {
  key: string;
  label: string;
  slug?: string;
  source: "sample" | "db";
  series: StoreSeries[];
};

const SAMPLE_HISTORY: ChartProduct[] = [
  {
    key: "olive-oil",
    label: "Extra Virgin Olive Oil",
    slug: "olive-oil",
    source: "sample",
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
    key: "coffee-beans",
    label: "Coffee Beans",
    slug: "coffee-beans",
    source: "sample",
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
  loadingLabel: string;
  extraProducts?: { name: string; slug: string }[];
};

export default function PriceChart({
  productLabel,
  storeLabel,
  allStoresLabel,
  currencyLabel,
  emptyStateLabel,
  loadingLabel,
  extraProducts = [],
}: Props) {
  const productOptions = useMemo(() => {
    const existing = new Set(SAMPLE_HISTORY.map((item) => item.key));
    const extras = extraProducts
      .filter((item) => item?.name && item?.slug)
      .map((item) => ({
        key: item.slug,
        label: item.name,
        slug: item.slug,
        source: "db" as const,
        series: [],
      }))
      .filter((item) => !existing.has(item.key));

    return extras.length ? [...extras, ...SAMPLE_HISTORY] : SAMPLE_HISTORY;
  }, [extraProducts]);

  const initialProduct = useMemo(
    () => productOptions.find((item) => item.source === "db") ?? productOptions[0],
    [productOptions]
  );

  const [product, setProduct] = useState(initialProduct);
  const preferredSet = useRef(false);
  const [productQuery, setProductQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [seriesOverride, setSeriesOverride] = useState<StoreSeries[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const preferred = productOptions.find((item) => item.source === "db");
    if (!preferredSet.current && preferred) {
      setProduct(preferred);
      setStoreFilter("all");
      preferredSet.current = true;
    }
  }, [productOptions]);

  useEffect(() => {
    if (!productOptions.find((item) => item.key === product.key)) {
      setProduct(productOptions[0]);
      setStoreFilter("all");
      setSeriesOverride(null);
      setLoading(false);
    }
  }, [productOptions, product.key]);

  useEffect(() => {
    if (product.source !== "db" || !product.slug) {
      setSeriesOverride(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setSeriesOverride(null);

    fetch(`/api/prices?productSlug=${encodeURIComponent(product.slug)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load prices");
        }
        const payload = (await response.json()) as {
          series?: StoreSeries[];
        };
        setSeriesOverride(payload.series ?? []);
      })
      .catch(() => {
        setSeriesOverride([]);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [product]);

  const activeSeries = product.source === "db" ? seriesOverride ?? [] : product.series;

  const uniqueSeries = useMemo(() => {
    const seen = new Set<string>();
    return activeSeries.filter((series) => {
      const key = series.points.map((point) => `${point.date}:${point.price}`).join("|");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [activeSeries]);

  const storeOptions = useMemo(() => {
    const stores = new Set<string>();
    uniqueSeries.forEach((series) => stores.add(series.store));
    return ["all", ...Array.from(stores)];
  }, [uniqueSeries]);

  const filteredProductOptions = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) {
      return productOptions;
    }

    const matches = productOptions.filter((item) => item.label.toLowerCase().includes(query));
    if (matches.find((item) => item.key === product.key)) {
      return matches;
    }

    return [product, ...matches];
  }, [productOptions, productQuery, product]);

  const chartData = useMemo(() => {
    const filteredSeries =
      storeFilter === "all"
        ? uniqueSeries
        : uniqueSeries.filter((series) => series.store === storeFilter);

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
  }, [uniqueSeries, storeFilter]);

  const formatTickValue = (value: number | string) => {
    const numeric = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(numeric)) {
      return `${value} ${currencyLabel}`;
    }
    return `${numeric.toFixed(2)} ${currencyLabel}`;
  };

  const fullscreenLabel = isFullscreen ? "Exit full screen" : "Full screen";

  return (
    <section className="section">
      <div className={isFullscreen ? "chart-shell chart-shell--fullscreen" : "chart-shell"}>
        <div className="card chart-card">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 16,
              alignItems: "flex-end",
            }}
          >
          <div className="chart-filter">
            <label htmlFor="product-search">Search products</label>
            <input
              id="product-search"
              className="chart-input"
              type="search"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder={productLabel}
            />
          </div>
          <div className="chart-filter">
            <label htmlFor="product-select">{productLabel}</label>
            <select
              id="product-select"
              className="chart-select"
              value={product.key}
              onChange={(event) => {
                const selected = productOptions.find(
                  (item) => item.key === event.target.value
                );
                if (selected) {
                  setProduct(selected);
                  setStoreFilter("all");
                }
              }}
            >
              {filteredProductOptions.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="chart-filter">
            <label htmlFor="store-select">{storeLabel}</label>
            <select
              id="store-select"
              className="chart-select"
              value={storeFilter}
              onChange={(event) => setStoreFilter(event.target.value)}
            >
              {storeOptions.map((store) => (
                <option key={store} value={store}>
                  {store === "all" ? allStoresLabel : store}
                </option>
              ))}
            </select>
          </div>
          <div className="chart-actions">
            <button
              type="button"
              className="button ghost"
              onClick={() => setIsFullscreen((current) => !current)}
            >
              {fullscreenLabel}
            </button>
          </div>
        </div>
        {loading ? (
          <p style={{ marginTop: 12, color: "var(--ink-muted)" }}>{loadingLabel}</p>
        ) : activeSeries.length === 0 ? (
          <p style={{ marginTop: 12, color: "var(--ink-muted)" }}>{emptyStateLabel}</p>
        ) : (
          <div className="chart-canvas">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top" },
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (value) => formatTickValue(value),
                    },
                  },
                },
              }}
            />
          </div>
        )}
      </div>
      </div>
    </section>
  );
}
