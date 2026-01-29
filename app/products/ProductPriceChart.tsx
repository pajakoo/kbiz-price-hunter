"use client";

import { useMemo } from "react";
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
import { getProductHistory } from "@/lib/product-history";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Props = {
  slug: string;
  currencyLabel: string;
};

export default function ProductPriceChart({ slug, currencyLabel }: Props) {
  const series = getProductHistory(slug);

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
