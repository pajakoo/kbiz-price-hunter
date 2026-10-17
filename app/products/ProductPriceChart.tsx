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
import { getProductHistory, type StoreSeries } from "@/lib/product-history";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Props = {
  slug: string;
  currencyLabel: string;
  city?: string;
  curated?: boolean;
};

export default function ProductPriceChart({ slug, currencyLabel, city = "", curated = false }: Props) {
  const [series, setSeries] = useState<StoreSeries[]>(() => getProductHistory(slug));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/prices?productSlug=${encodeURIComponent(slug)}&maxPoints=1000&city=${encodeURIComponent(city)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load price history");
        }
        return response.json() as Promise<{ series?: StoreSeries[] }>;
      })
      .then((payload) => {
        if (!active) return;
        if (payload.series) {
          setSeries(payload.series);
        }
      })
      .catch(() => {
        if (!active) return;
        setSeries(getProductHistory(slug));
      });

    return () => {
      active = false;
    };
  }, [slug, city]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(max-width: 720px)");
    const update = () => setIsCompact(media.matches);
    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const chartData = useMemo(() => {
    const colors = ["#3b6df6", "#1f3b2c", "#9a6df7", "#c2410c", "#0891b2", "#be185d", "#6d7c18", "#7c3aed", "#475569", "#a16207"];
    const promoColor = "#f59e0b";

    const datasets = series.map((item, index) => {
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
        pointStyle: promoFlags.map((flag) => (flag ? "triangle" : "circle")),
        pointRadius: promoFlags.map((flag) => (flag ? 6 : 3)),
        pointBackgroundColor: promoFlags.map((flag) => (flag ? promoColor : colors[index % colors.length])),
        pointBorderColor: promoFlags.map((flag) => (flag ? promoColor : colors[index % colors.length])),
      };
    });

    const dates = datasets.flatMap((dataset) => dataset.data.map((point) => point.x));
    return { datasets, minDate: dates.length ? Math.min(...dates) : undefined,
      maxDate: dates.length ? Math.max(...dates) : undefined };
  }, [series]);

  const formatTickValue = (value: number | string) => {
    const numeric = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(numeric)) {
      return `${value} ${currencyLabel}`;
    }
    return `${numeric.toFixed(2)} ${currencyLabel}`;
  };

  const legendLabelMax = 28;
  const formatLegendLabel = (label: string) =>
    label.length > legendLabelMax ? `${label.slice(0, legendLabelMax - 1)}…` : label;

  const fullscreenLabel = isFullscreen ? "Exit full screen" : "Full screen";

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
      <p style={{ color: "var(--ink-muted)", fontSize: "0.85rem" }}>
        Recorded observations / Отчетени цени. Gaps over 93 days are not connected / Периоди над 93 дни без наблюдение не са свързани.
      </p>
      {curated && <p style={{ color: "var(--ink-muted)", fontSize: "0.85rem" }}>
        До 10 обекта с най-много наблюдения за избрания град; всички обекти са в таблицата. / Up to 10 stores with the most observations in the selected city; see the table for all stores.
      </p>}
      <div className="chart-canvas">
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: {
                callbacks: {
                  title: (items) => items[0]?.parsed.x != null ? new Date(items[0].parsed.x).toISOString().slice(0, 10) : "",
                  label: (item) => `${item.dataset.label}: ${formatTickValue(item.parsed.y ?? 0)}`,
                },
              },
              legend: {
                position: "bottom",
                display: !isCompact,
                labels: {
                  boxWidth: 12,
                  padding: 12,
                  generateLabels: (chart) =>
                    ChartJS.defaults.plugins.legend.labels
                      .generateLabels(chart)
                      .map((label) => ({
                        ...label,
                        text: formatLegendLabel(label.text),
                      })),
                },
              },
            },
            scales: {
              x: {
                type: "linear",
                min: chartData.minDate,
                max: chartData.maxDate,
                ticks: {
                  maxTicksLimit: 6,
                  callback: (value) => new Date(Number(value)).toISOString().slice(0, 10),
                },
              },
              y: {
                ticks: {
                  precision: 2,
                  callback: (value) => formatTickValue(value),
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
