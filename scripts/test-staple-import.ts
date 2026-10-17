import assert from "node:assert/strict";
import { importOptions, validateRecords } from "./staple-import-validation";

const env = { DATABASE_URL: "postgresql://localhost/test", DATABASE_URL_SUPABASE: "postgresql://example.com/test" };
assert.equal(importOptions([], env).url, env.DATABASE_URL);
assert.equal(importOptions(["--production", "--dry-run"], env).url, env.DATABASE_URL_SUPABASE);
assert.equal(importOptions(["--dry-run"], env).dryRun, true);
assert.throws(() => importOptions([], { DATABASE_URL: env.DATABASE_URL_SUPABASE }));
assert.throws(() => importOptions(["--production"], { DATABASE_URL: env.DATABASE_URL }));
assert.throws(() => importOptions(["--production"], { DATABASE_URL_SUPABASE: env.DATABASE_URL }));
assert.throws(() => importOptions(["--prod"], env));
const row = { slug: "milk", supplier: "supplier", code: "123", name: "Milk", cityCode: "001",
  store: "Store", date: "2026-01-16", amount: "0.6391", source: "archive.csv", isPromo: false };
const allowed = new Set(["milk"]);
validateRecords({ records: [row] }, allowed);
for (const change of [{ date: "2026-02-30" }, { amount: "NaN" }, { amount: "-1" },
  { amount: "0" }, { isPromo: "false" }, { slug: "other" }, { source: "" }]) {
  assert.throws(() => validateRecords({ records: [{ ...row, ...change }] }, allowed));
}
assert.throws(() => validateRecords({ records: [] }, allowed));
assert.throws(() => validateRecords({ records: [row, row] }, allowed));
assert.throws(() => validateRecords({ records: [row] }, new Set(["milk", "sugar"])));
console.log("Staple import targeting and validation tests passed.");
