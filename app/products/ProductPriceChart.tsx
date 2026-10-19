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
import { type StoreSeries } from "@/lib/product-history";
import { useStoreComparison } from "./StoreComparison";
import type { ComparisonStore } from "@/lib/store-comparison";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
const STORE_COLORS = ["#3b82f6", "#f59e0b", "#a78bfa", "#06b6d4", "#f472b6"];

type Props = {
  slug: string;
  currencyLabel: string;
  city?: string;
  curated?: boolean;
  locale?: "bg" | "en";
};

export default function ProductPriceChart(props: Props) {
  const { stores, toggle } = useStoreComparison(props.slug);
  return <PriceChart key={JSON.stringify([props.slug, props.city, stores.map(store => store.id)])}
    {...props} comparisonStores={stores} removeStore={toggle} />;
}

function PriceChart({ slug, currencyLabel, city = "", curated = false, locale = "en", comparisonStores, removeStore }: Props & {
  comparisonStores: ComparisonStore[]; removeStore: (store: ComparisonStore) => void;
}) {
  const [series, setSeries] = useState<(StoreSeries & { storeId?: string })[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("loading");
  const [axisColor, setAxisColor] = useState("#94a3b8");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const bg = locale === "bg";
  const comparisonIds = JSON.stringify(comparisonStores.map(store => store.id));

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ productSlug: slug, maxPoints: "1000", city });
    const ids: string[] = JSON.parse(comparisonIds);
    ids.forEach(id => query.append("storeId", id));
    const controller = new AbortController();
    fetch(`/api/prices?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load price history");
        }
        return response.json() as Promise<{ series?: (StoreSeries & { storeId?: string })[] }>;
      })
      .then((payload) => {
        if (!active) return;
        if (payload.series) {
          const histories = ids.length ? [...payload.series].sort((a, b) => ids.indexOf(a.storeId ?? "") - ids.indexOf(b.storeId ?? "")) : payload.series;
          setSeries(histories);
          setSelected(histories.slice(0, ids.length ? 5 : 3).map((_, index) => index));
          setStatus("ready");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [slug, city, comparisonIds]);

  useEffect(() => {
    const update = () => setAxisColor(getComputedStyle(document.documentElement).getPropertyValue("--ink-muted").trim() || "#94a3b8");
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setIsFullscreen(false); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [isFullscreen]);

  const chartData = useMemo(() => {
    const colors = STORE_COLORS;
    const promoColor = "#f59e0b";

    const datasets = selected.filter(index => series[index]).map((seriesIndex, index) => {
      const item = series[seriesIndex];
      const points = [...item.points].sort((a, b) => a.date.localeCompare(b.date));
      const data: { x: number; y: number | null; isPromo: boolean }[] = [];
      for (const point of points) {
        const x = Date.parse(`${point.date}T00:00:00Z`);
        const previous = data.at(-1);
        // Leave long missing periods visibly disconnected instead of interpolating them.
        if (previous && x - previous.x > 93 * 86400000) {
          data.push({ x: (previous.x + x) / 2, y: null, isPromo: false });
        }
        data.push({ x, y: point.price, isPromo: point.isPromo ?? false });
      }
      const promoFlags = data.map((point) => point.isPromo);

      return {
        label: item.store,
        data,
        borderColor: colors[index % colors.length],
        backgroundColor: "rgba(59, 109, 246, 0.15)",
        spanGaps: false,
        tension: 0,
        borderWidth: 2,
        pointStyle: promoFlags.map((flag) => (flag ? "triangle" : "circle")),
        pointRadius: promoFlags.map((flag) => (flag ? 6 : 3)),
        pointBackgroundColor: promoFlags.map((flag) => (flag ? promoColor : colors[index % colors.length])),
        pointBorderColor: promoFlags.map((flag) => (flag ? promoColor : colors[index % colors.length])),
      };
    });

    const dates = datasets.flatMap((dataset) => dataset.data.map((point) => point.x));
    const minDate = dates.length ? Math.min(...dates) : undefined;
    const maxDate = dates.length ? Math.max(...dates) : undefined;
    // A single observation gives min === max, which collapses a linear axis and hides the point.
    const padded = minDate !== undefined && maxDate !== undefined && minDate === maxDate;
    return { datasets, minDate: padded ? minDate - 43200000 : minDate,
      maxDate: padded ? maxDate + 43200000 : maxDate, padded };
  }, [series, selected]);

  const formatTickValue = (value: number | string) => {
    const numeric = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(numeric)) {
      return `${value} ${currencyLabel}`;
    }
    return `${numeric.toFixed(2)} ${currencyLabel}`;
  };

  const fullscreenLabel = isFullscreen ? (bg ? "Затвори" : "Exit full screen") : (bg ? "Цял екран" : "Full screen");
  const dateFormat = new Intl.DateTimeFormat(bg ? "bg-BG" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const dateTimeFormat = new Intl.DateTimeFormat(bg ? "bg-BG" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  return (
    <div className={isFullscreen ? "chart-shell chart-shell--fullscreen" : "chart-shell"}>
      <div className="chart-toolbar">
        <button
          type="button"
          className="button ghost"
          onClick={() => setIsFullscreen((current) => !current)}
        >
          {fullscreenLabel}
        </button>
      </div>
      <details className="price-chart-info"><summary>{bg ? "За данните" : "About this history"}</summary>
        <p>{bg ? "Показани са отчетени цени, не гарантирана текуща наличност. Периоди над 93 дни без наблюдение не са свързани. Триъгълниците означават промоция." : "Recorded prices, not guaranteed current availability. Gaps over 93 days are not connected. Triangles mark promotions."}</p>
      </details>
      {comparisonStores.length > 0 && <p className="price-chart-info">{bg ? "Сравняват се избраните от таблицата магазини, независимо от филтъра за град." : "Comparing stores selected in the table, regardless of the city filter."}</p>}
      {curated && !comparisonStores.length && <p style={{ color: "var(--ink-muted)", fontSize: "0.85rem" }}>
        {bg ? "Избор от до 10 обекта с най-много наблюдения; всички обекти са в таблицата." : "Choose from up to 10 stores with the most observations; all stores are in the table."}
      </p>}
      {status === "ready" && series.length > 0 && <>
        {!comparisonStores.length && <details className="price-chart-picker">
          <summary>{bg ? "Избери магазини" : "Choose stores"} ({selected.length}/5)</summary>
          <input type="search" className="chart-input" aria-label={bg ? "Търси магазин или град" : "Search store or city"}
            placeholder={bg ? "Търси магазин или град…" : "Search store or city…"} value={search} onChange={event => setSearch(event.target.value)} />
          <div className="price-chart-store-list">
            {series.map((item, index) => ({ item, index })).filter(({ item }) => item.store.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).map(({ item, index }) =>
              <label key={index}><input type="checkbox" checked={selected.includes(index)} disabled={!selected.includes(index) && selected.length >= 5}
                onChange={() => setSelected(current => current.includes(index) ? current.filter(value => value !== index) : current.length < 5 ? [...current, index] : current)} />{item.store}</label>)}
          </div>
          <small>{bg ? "До 5 магазина едновременно. Търсенето обхваща заредените истории." : "Compare up to 5 stores. Search covers loaded histories."}</small>
        </details>}
        <div className="price-chart-chips" aria-label={bg ? "Избрани магазини" : "Selected stores"}>
          {selected.map((index, position) => <button key={index} type="button" title={series[index]?.store}
            aria-label={`${bg ? "Премахни" : "Remove"} ${series[index]?.store}`} onClick={() => {
              const store = comparisonStores.find(store => store.id === series[index]?.storeId);
              if (store) removeStore(store);
              else setSelected(current => current.filter(value => value !== index));
            }}>
            <span style={{ background: STORE_COLORS[position] }} aria-hidden="true" /><span>{series[index]?.store}</span><span aria-hidden="true">×</span>
          </button>)}
        </div>
      </>}
      {status !== "ready" || !series.length || !selected.length ? <p role="status">{status === "loading" ? (bg ? "Зареждане…" : "Loading…") : status === "error" ? (bg ? "Историята не може да се зареди. Опитайте да презаредите страницата." : "History could not load. Try reloading the page.") : !series.length ? (bg ? "Няма записани цени." : "No recorded prices.") : (bg ? "Изберете магазин за сравнение." : "Choose a store to compare.")}</p> : <div className="chart-canvas">
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "nearest", intersect: true },
            plugins: {
              tooltip: {
                filter: (_item, index) => index === 0,
                callbacks: {
                  title: (items) => items[0]?.parsed.x != null ? new Date(items[0].parsed.x).toISOString().slice(0, 10) : "",
                  label: (item) => [formatTickValue(item.parsed.y ?? 0), ...(item.dataset.label?.match(/.{1,38}(?:\s|$)|.{1,38}/g) ?? [])],
                },
              },
              legend: {
                display: false,
              },
            },
            scales: {
              x: {
                type: "linear",
                min: chartData.minDate,
                max: chartData.maxDate,
                ticks: {
                  color: axisColor,
                  maxTicksLimit: chartData.padded ? 3 : 6,
                  callback: (value) => (chartData.padded ? dateTimeFormat : dateFormat).format(new Date(Number(value))),
                },
              },
              y: {
                title: { display: true, text: currencyLabel, color: axisColor },
                ticks: {
                  color: axisColor,
                  precision: 2,
                  callback: (value) => Number(value).toFixed(2),
                },
              },
            },
          }}
        />
      </div>}
    </div>
  );
}
