import fs from "node:fs";
import { createHash } from "node:crypto";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { slugify } from "../lib/slugify";
import { normalizeCity } from "../lib/city-normalize";
import { getProductCategories } from "../lib/product-categories";

dotenv.config();
const host = new URL(process.env.DATABASE_URL ?? "").hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
  throw new Error("History sample may only be imported into a local database");
}
const input = JSON.parse(fs.readFileSync("data/history-sample.json", "utf8")) as {
  supplier: string;
  dates: string[];
  records: { date: string; code: string; name: string; cityCode: string; store: string;
    source: string; amount: string; isPromo: boolean }[];
};
const id = (...parts: string[]) => `history-sample-${createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32)}`;
const prisma = new PrismaClient();

async function main() {
  if (input.records.length !== 500 || input.dates.length !== 5) throw new Error("Expected 500 observations over five dates");
  const priceIds = new Set<string>();
  const productIds = new Set<string>();
  const storeIds = new Set<string>();
  for (const row of input.records) {
    if (!input.dates.includes(row.date) || !Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0) throw new Error("Invalid observation");
    productIds.add(id(input.supplier, row.code));
    storeIds.add(id(input.supplier, row.cityCode, row.store));
    priceIds.add(id(input.supplier, row.code, row.cityCode, row.store, row.date));
  }
  if (productIds.size !== 10 || storeIds.size !== 10 || priceIds.size !== 500) throw new Error("Incomplete or duplicate sample");
  await prisma.$transaction(async (tx) => {
    for (const row of input.records) {
      const productId = id(input.supplier, row.code);
      const storeId = id(input.supplier, row.cityCode, row.store);
      await tx.product.upsert({ where: { id: productId }, update: {}, create: {
        id: productId, slug: `sample-bulmag-${row.code}-${slugify(row.name)}`,
        name: row.name, description: "Local historical CSV sample / Локална историческа CSV извадка",
        categories: getProductCategories(row.name),
      } });
      await tx.store.upsert({ where: { id: storeId }, update: {}, create: {
        id: storeId, name: row.store, city: normalizeCity(row.cityCode, row.store),
      } });
      const data = { productId, storeId, amount: Number(row.amount), currency: "EUR",
        recordedAt: new Date(`${row.date}T00:00:00Z`), source: row.source, isPromo: row.isPromo };
      await tx.price.upsert({ where: { id: id(input.supplier, row.code, row.cityCode, row.store, row.date) },
        update: data, create: { id: id(input.supplier, row.code, row.cityCode, row.store, row.date), ...data } });
    }
  }, { timeout: 120000 });
  const count = await prisma.price.count({ where: { id: { in: [...priceIds] } } });
  if (count !== 500) throw new Error(`Expected 500 saved observations, got ${count}`);
  console.log("Verified: 10 products, 10 stores, 5 dates, 500 observations. Currency: EUR (existing import convention).");
  const products = await prisma.product.findMany({ where: { id: { in: [...productIds] } }, select: { slug: true, name: true } });
  fs.writeFileSync("data/history-sample-products.json", JSON.stringify(products, null, 2));
  console.log(products.map((p) => `http://localhost:3000/bg/products/${p.slug}`).join("\n"));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
