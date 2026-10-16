import assert from "node:assert/strict";
import { test } from "node:test";
import { latestStorePrices } from "./latest-store-prices";

test("historical discounts do not replace the latest store observation", () => {
  const latest = latestStorePrices([
    { storeId: "a", amount: 5 },
    { storeId: "b", amount: 4 },
    { storeId: "a", amount: 1 },
    { storeId: "b", amount: 9 },
  ]);
  assert.deepEqual([...latest.values()].map((price) => price.amount), [5, 4]);
});

test("missing observations produce no offers", () => {
  assert.equal(latestStorePrices([]).size, 0);
});

test("equal timestamps preserve the caller's deterministic ordering", () => {
  const latest = latestStorePrices([
    { storeId: "a", amount: 3 },
    { storeId: "a", amount: 2 },
  ]);
  assert.equal(latest.get("a")?.amount, 3);
});
