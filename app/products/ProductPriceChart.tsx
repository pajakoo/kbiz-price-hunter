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

  return (
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
  );
}
