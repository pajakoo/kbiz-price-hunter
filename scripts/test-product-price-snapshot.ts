import assert from "node:assert/strict";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { queryProductPriceSnapshot } from "../lib/product-price-snapshot";
import { latestStorePrices } from "../lib/latest-store-prices";
import { paginate } from "../lib/pagination";

dotenv.config();
const db = new PrismaClient();

async function main() {
  const items = Array.from({ length: 1210 }, (_, index) => index);
  const pages = Array.from({ length: 25 }, (_, index) => paginate(items, String(index + 1)).items);
  assert.deepEqual(pages.flat(), items);
  for (const value of [undefined, "0", "-1", "NaN", "Infinity", "1.5"]) {
    assert.equal(paginate(items, value).page, 1);
  }
  assert.equal(paginate(items, "9999").page, 25);
  assert.deepEqual(paginate([], "2").items, []);
  assert.equal(paginate([], "2").page, 1);

  const product = await db.product.findUniqueOrThrow({ where: { slug: "byala-zahar-sladeya-1kg" } });
  const before = performance.now();
  const history = await db.price.findMany({ where: { productId: product.id }, include: { store: true },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }] });
  const oldMs = performance.now() - before;
  const start = performance.now();
  const snapshot = await queryProductPriceSnapshot(db, product.id);
  const newMs = performance.now() - start;
  assert.ok(history.length > 0);
  const expected = [...latestStorePrices(history).values()].map(price => ({ id: price.id, storeId: price.storeId,
    amount: price.amount, recordedAt: price.recordedAt, source: price.source,
    store: { name: price.store.name, city: price.store.city } }));
  assert.deepEqual(snapshot, expected);
  assert.deepEqual(await queryProductPriceSnapshot(db, "missing-test-product"), []);
  console.log(JSON.stringify({ historyRows: history.length, snapshotRows: snapshot.length,
    oldQueryMs: Math.round(oldMs), newQueryMs: Math.round(newMs), result: "Exact latest-price parity and pagination checks passed" }));
}
main().catch(error => { console.error(error.name); process.exitCode = 1; }).finally(() => db.$disconnect());
