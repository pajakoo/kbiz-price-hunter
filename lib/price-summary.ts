import type { PrismaClient } from "@prisma/client";

export type PriceSummary = {
  dates: { date: string; count: number; min: number; median: number; max: number }[];
  change: number | null;
  storeCount: number;
  cityCount: number;
  observationCount: number;
};

export function computeChange(dates: PriceSummary["dates"]) {
  const first = dates[0];
  const last = dates.at(-1);
  return first && last && first.date !== last.date && first.median > 0
    ? ((last.median - first.median) / first.median) * 100 : null;
}

type Row = { date: Date; count: bigint; min: number; median: number; max: number };

export async function queryPriceSummary(db: PrismaClient, productId: string): Promise<PriceSummary> {
  const rows = await db.$queryRaw<Row[]>`
    SELECT date_trunc('day', "recordedAt")::date AS date,
           count(*)::int AS count,
           min(amount)::float8 AS min,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY amount)::float8 AS median,
           max(amount)::float8 AS max
    FROM "Price"
    WHERE "productId" = ${productId}
    GROUP BY 1
    ORDER BY 1
  `;
  const totals = await db.$queryRaw<{ stores: bigint; cities: bigint; observations: bigint }[]>`
    SELECT count(DISTINCT p."storeId") AS stores, count(DISTINCT s.city) AS cities, count(*) AS observations
    FROM "Price" p JOIN "Store" s ON s.id = p."storeId"
    WHERE p."productId" = ${productId}
  `;
  const dates = rows.map(row => ({ date: row.date.toISOString().slice(0, 10),
    count: Number(row.count), min: row.min, median: row.median, max: row.max }));
  return { dates, change: computeChange(dates), storeCount: Number(totals[0]?.stores ?? 0),
    cityCount: Number(totals[0]?.cities ?? 0), observationCount: Number(totals[0]?.observations ?? 0) };
}
