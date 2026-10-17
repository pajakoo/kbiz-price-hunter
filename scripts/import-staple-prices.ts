import fs from "node:fs";
import { createHash } from "node:crypto";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { stapleProducts } from "../lib/staple-profiles";
import { normalizeCity } from "../lib/city-normalize";
import { getProductCategories } from "../lib/product-categories";
import { importOptions, validateRecords } from "./staple-import-validation";

dotenv.config();
type Row = { slug: string; supplier: string; code: string; name: string; cityCode: string; store: string;
  date: string; amount: string; isPromo: boolean; source: string };
const id = (...parts: string[]) => `staple-${createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32)}`;
let prisma: PrismaClient | undefined;

async function main() {
  const options = importOptions(process.argv.slice(2), process.env);
  const input: unknown = JSON.parse(fs.readFileSync("data/staple-prices.json", "utf8"));
  const allowed = new Set(stapleProducts.map(p => p.slug));
  validateRecords(input, allowed);
  const records = (input as { records: Row[] }).records;
  const unique = new Set<string>();
  for (const r of records) {
    const key = id(r.slug, r.supplier, r.cityCode, r.store, r.date);
    if (unique.has(key)) throw new Error("Observation ID collision");
    unique.add(key);
  }
  console.log(`${options.production ? "Production" : "Local"} import: ${records.length} EUR observations across ${allowed.size} products.`);
  if (options.dryRun) {
    console.log("Dry run passed: input validated; no database connection or writes.");
    return;
  }
  prisma = new PrismaClient({ datasourceUrl: options.url });
  await prisma.$transaction(async tx => {
    const productIds = new Map<string, string>();
    for (const profile of stapleProducts) {
      const product = await tx.product.upsert({ where: { slug: profile.slug }, update: {}, create: {
        id: id(profile.slug), slug: profile.slug, name: profile.name, description: profile.description.bg,
        categories: getProductCategories(profile.name),
      } });
      productIds.set(profile.slug, product.id);
    }
    const stores = new Map(records.map(r => [id(r.supplier, r.cityCode, r.store),
      { id: id(r.supplier, r.cityCode, r.store), name: r.store, city: normalizeCity(r.cityCode, r.store) }]));
    await tx.store.createMany({ data: [...stores.values()], skipDuplicates: true });
    // Replace only this pilot's deterministic observations; curated products and other history survive.
    await tx.price.deleteMany({ where: { id: { startsWith: "staple-" }, productId: { in: [...productIds.values()] } } });
    for (let offset = 0; offset < records.length; offset += 500) {
      await tx.price.createMany({ data: records.slice(offset, offset + 500).map(r => ({
        id: id(r.slug, r.supplier, r.cityCode, r.store, r.date), productId: productIds.get(r.slug)!,
        storeId: id(r.supplier, r.cityCode, r.store), amount: Number(r.amount), currency: "EUR",
        recordedAt: new Date(`${r.date}T00:00:00Z`), source: r.source, isPromo: r.isPromo,
      })) });
    }
    const saved = await tx.price.count({ where: { id: { in: [...unique] } } });
    if (saved !== records.length) throw new Error(`Expected ${records.length}, saved ${saved}`);
  }, { timeout: 180000 });
  console.log(`Verified ${records.length} EUR observations across ${stapleProducts.length} canonical products.`);
}
main().catch(() => {
  console.error("Import failed. Check input, database configuration and schema. Database writes are transactional; connection details are omitted.");
  process.exitCode = 1;
}).finally(() => prisma?.$disconnect());
