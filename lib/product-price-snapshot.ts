import type { PrismaClient } from "@prisma/client";

type SnapshotRow = {
  id: string;
  storeId: string;
  amount: number;
  recordedAt: Date;
  source: string | null;
  storeName: string;
  storeCity: string | null;
};

// Pick the latest observation in PostgreSQL before joining store details.
export async function queryProductPriceSnapshot(db: PrismaClient, productId: string) {
  const rows = await db.$queryRaw<SnapshotRow[]>`
    SELECT latest.*, s.name AS "storeName", s.city AS "storeCity"
    FROM (
      SELECT DISTINCT ON ("storeId") id, "storeId", amount, "recordedAt", source
      FROM "Price"
      WHERE "productId" = ${productId}
      ORDER BY "storeId", "recordedAt" DESC, id DESC
    ) latest
    JOIN "Store" s ON s.id = latest."storeId"
    ORDER BY latest."recordedAt" DESC, latest.id DESC
  `;
  return rows.map(({ storeName, storeCity, ...price }) => ({
    ...price, store: { name: storeName, city: storeCity },
  }));
}
