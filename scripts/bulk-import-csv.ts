import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import dotenv from "dotenv";
import { Client } from "pg";
import { from as copyFrom } from "pg-copy-streams";
import { normalizeCity } from "../lib/city-normalize";
import { normalizeProductName } from "../lib/product-normalize";
import { getProductCategories } from "../lib/product-categories";
import { slugify } from "../lib/slugify";
import { buildCanonicalKey } from "../lib/canonical-key";

dotenv.config();
type Batch = { archive: string; date: string; digest: string; logicalKey: string;
  files: { filePath: string; source: string; rows: number; repairedQuoteRows?: number }[];
  rejected: { entry: string; line: number; reason: string }[] };
type Row = { city: string; store: string; productName: string; productCode: string;
  amount: string; isPromo: boolean; identity: string };
const hash = (...parts: string[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");
const escape = (value: string | null) => value === null ? "\\N" : value
  .replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r");

async function* stagedRows(batch: Batch, currency: string) {
  for (const file of batch.files) {
    const stream = fs.createReadStream(file.filePath, { encoding: "utf8" });
    const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
    try {
      for await (const line of lines) {
        const row: Row = JSON.parse(line);
        const name = normalizeProductName(row.productName);
        const slug = slugify(name) || `source-${hash(file.source, row.productCode)}`;
        const city = normalizeCity(row.city, row.store);
        yield [hash("store", row.store, city ?? ""), row.store, city,
          hash("product", slug), slug, name, getProductCategories(name).join(","), buildCanonicalKey(name),
          hash("price-v1", batch.date, currency, row.identity), row.amount, String(row.isPromo),
          batch.date, currency, `${batch.archive}/${file.source}`, hash(file.source, row.productCode)].map(escape).join("\t") + "\n";
      }
    } finally {
      lines.close();
      stream.destroy();
    }
  }
}

async function importBatch(client: Client, batch: Batch, currency: string) {
  const batchId = hash("csv-v1", batch.date, currency, batch.digest);
  const logicalKey = hash("csv-v1", currency, batch.logicalKey);
  await client.query("BEGIN");
  try {
    // Serialize import writers; temp staging remains isolated even across connections.
    await client.query("SELECT pg_advisory_xact_lock(735192046)");
    if ((await client.query('SELECT id FROM "CsvImportBatch" WHERE id = $1', [batchId])).rowCount) {
      await client.query("COMMIT");
      console.log(`Skipped completed input: ${batch.archive}`);
      return;
    }
    if ((await client.query('SELECT id FROM "CsvImportBatch" WHERE "logicalKey" = $1', [logicalKey])).rowCount) {
      throw new Error(`Changed contents for an already imported day/source set: ${batch.archive}. Review correction separately.`);
    }
    await client.query(`CREATE TEMP TABLE csv_price_staging (
      store_id TEXT, store_name TEXT, store_city TEXT, product_id TEXT, product_slug TEXT,
      product_name TEXT, product_categories TEXT, canonical_key TEXT, price_id TEXT,
      amount NUMERIC, is_promo BOOLEAN, recorded_at DATE, currency TEXT, source TEXT, product_key TEXT
    ) ON COMMIT DROP`);
    const copy = client.query(copyFrom("COPY csv_price_staging FROM STDIN WITH (FORMAT text)")) as unknown as Writable;
    await pipeline(Readable.from(stagedRows(batch, currency)), copy);
    await client.query(`UPDATE csv_price_staging s SET product_slug=p.slug
      FROM "CsvProductIdentity" i JOIN "Product" p ON p.id=i."productId"
      WHERE i."sourceKey"=s.product_key`);
    const conflicts = await client.query(`SELECT price_id FROM csv_price_staging
      GROUP BY price_id HAVING COUNT(DISTINCT (amount,is_promo,product_slug)) > 1 LIMIT 1`);
    if (conflicts.rowCount) throw new Error("Conflicting observations in batch");
    await client.query(`INSERT INTO "Store" (id,name,city,"createdAt","updatedAt")
      SELECT DISTINCT ON (s.store_name,s.store_city) s.store_id,s.store_name,s.store_city,NOW(),NOW()
      FROM csv_price_staging s WHERE NOT EXISTS (
        SELECT 1 FROM "Store" e WHERE e.name=s.store_name AND e.city IS NOT DISTINCT FROM s.store_city)`);
    // Imported product metadata never overwrites editorial descriptions or reviewed grouping.
    await client.query(`INSERT INTO "Product" (id,slug,name,description,categories,"canonicalKey","createdAt","updatedAt")
      SELECT DISTINCT ON (product_slug) product_id,product_slug,product_name,NULL,
        string_to_array(product_categories,','),canonical_key,NOW(),NOW()
      FROM csv_price_staging ORDER BY product_slug,product_name
      ON CONFLICT (slug) DO NOTHING`);
    await client.query(`INSERT INTO "CsvProductIdentity" ("sourceKey","productId")
      SELECT DISTINCT ON (s.product_key) s.product_key,p.id FROM csv_price_staging s
      JOIN "Product" p ON p.slug=s.product_slug ORDER BY s.product_key,p.id
      ON CONFLICT ("sourceKey") DO NOTHING`);
    const changed = await client.query(`SELECT p.id FROM "Price" p JOIN csv_price_staging s ON p.id=s.price_id
      WHERE p.amount IS DISTINCT FROM s.amount::double precision OR p."isPromo" IS DISTINCT FROM s.is_promo LIMIT 1`);
    if (changed.rowCount) throw new Error("Changed existing observation; explicit correction review required");
    const inserted = await client.query(`INSERT INTO "Price" (id,amount,currency,"recordedAt","productId","storeId",source,"isPromo")
      SELECT DISTINCT ON (s.price_id) s.price_id,s.amount::double precision,s.currency,s.recorded_at::timestamp,p.id,st.id,s.source,s.is_promo
      FROM csv_price_staging s JOIN "Product" p ON p.slug=s.product_slug
      JOIN LATERAL (SELECT id FROM "Store" WHERE name=s.store_name AND city IS NOT DISTINCT FROM s.store_city ORDER BY id LIMIT 1) st ON true
      ORDER BY s.price_id ON CONFLICT (id) DO NOTHING`);
    await client.query(`INSERT INTO "CsvImportBatch" (id,"logicalKey",source,"recordedAt",currency,"rowCount","completedAt")
      VALUES ($1,$2,$3,$4,$5,$6,NOW())`, [batchId, logicalKey, batch.archive, batch.date, currency, inserted.rowCount]);
    await client.query("COMMIT");
    console.log(`Imported ${batch.archive}: ${inserted.rowCount} prices`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    if (i < 0) return undefined;
    if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`Missing value for ${flag}`);
    return args[i + 1];
  };
  const target = value("--path") ?? value("-p");
  const date = value("--date") ?? value("-d");
  const currency = value("--currency");
  if (!target || !currency || !["EUR", "BGN"].includes(currency)) {
    throw new Error("Usage: npm run import:csv -- --path <ZIP/CSV/folder> --currency EUR|BGN [--date YYYY-MM-DD] [--dry-run] [--report path.json]");
  }
  // Current public charts are EUR-only; BGN needs a separate conversion design.
  if (currency !== "EUR") throw new Error("BGN is not supported by the current EUR-only UI. No data imported.");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "price-hunter-input-"));
  let client: Client | undefined;
  try {
    execFileSync("python3", [path.join(__dirname, "prepare-price-input.py"), path.resolve(target), temp, date ?? ""], { stdio: "inherit" });
    const batches: Batch[] = JSON.parse(fs.readFileSync(path.join(temp, "manifest.json"), "utf8"));
    const report = batches.map((b) => ({ archive: b.archive, date: b.date, files: b.files.length,
      rows: b.files.reduce((sum, f) => sum + f.rows, 0),
      repairedQuoteRows: b.files.reduce((sum, f) => sum + (f.repairedQuoteRows ?? 0), 0),
      rejected: b.rejected }));
    console.log(JSON.stringify(report.map(({ rejected, ...summary }) => ({
      ...summary, rejectedCount: rejected.length, firstRejections: rejected.slice(0, 5),
    })), null, 2));
    const reportPath = value("--report");
    if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    if (args.includes("--dry-run")) return;
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (args.includes("--quarantine")) {
      if (!reportPath || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
        throw new Error("Quarantine trials require a local database and --report for the audit trail.");
      }
    } else if (batches.some((b) => b.rejected.length)) {
      throw new Error("Rejected rows found. Review input or use local --quarantine with --report.");
    }
    console.log(`Target: ${url.hostname}:${url.port || "5432"}${url.pathname}`);
    client = new Client({ connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLINSECURE === "true" ? { rejectUnauthorized: false } : undefined });
    await client.connect();
    for (const batch of batches) await importBatch(client, batch, currency);
  } finally {
    try {
      if (client) await client.end();
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Import failed"); process.exitCode = 1; });
