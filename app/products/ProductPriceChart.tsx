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
};

export default function ProductPriceChart({ slug, currencyLabel }: Props) {
  const [series, setSeries] = useState<StoreSeries[]>(() => getProductHistory(slug));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    let active = true;
    setSeries(getProductHistory(slug));

    fetch(`/api/prices?productSlug=${encodeURIComponent(slug)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load price history");
        }
        return response.json() as Promise<{ series?: StoreSeries[] }>;
      })
      .then((payload) => {
        if (!active) return;
        if (payload.series && payload.series.length > 0) {
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
  }, [slug]);

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
    const labels = Array.from(
      new Set(series.flatMap((item) => item.points.map((point) => point.date)))
    ).sort();

    const colors = ["#3b6df6", "#1f3b2c", "#9a6df7"];

    const datasets = series.map((item, index) => ({
      label: item.store,
      data: labels.map((label) => {
        const point = item.points.find((p) => p.date === label);
        return point ? point.price : null;
      }),
      borderColor: colors[index % colors.length],
      backgroundColor: "rgba(59, 109, 246, 0.15)",
      spanGaps: true,
      tension: 0.3,
    }));

    return { labels, datasets };
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
      <div className="chart-canvas">
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
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
              y: {
                ticks: {
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
