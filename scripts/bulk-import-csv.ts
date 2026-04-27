import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { Client } from "pg";
import { from as copyFrom } from "pg-copy-streams";
import { normalizeCity } from "../lib/city-normalize";
import { normalizeProductName } from "../lib/product-normalize";
import { getProductCategories } from "../lib/product-categories";
import { slugify } from "../lib/slugify";
import { buildCanonicalKey } from "../lib/canonical-key";

dotenv.config();

const REQUIRED_HEADERS = {
  city: "Населено място",
  store: "Търговски обект",
  productName: "Наименование на продукта",
  productCode: "Код на продукта",
  retailPrice: "Цена на дребно",
  promoPrice: "Цена в промоция",
};

type CsvRow = {
  city: string;
  store: string;
  productName: string;
  productCode: string;
  retailPrice: string;
  promoPrice: string;
};

type ImportRow = {
  storeId: string;
  storeName: string;
  storeCity: string | null;
  productId: string;
  productSlug: string;
  productName: string;
  productDescription: string;
  productCategories: string[];
  canonicalKey: string | null;
  priceId: string;
  amount: number;
  isPromo: boolean;
  recordedAt: string;
  source: string;
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parsePrice(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isNaN(amount) ? null : amount;
}

function buildSlug(productCode: string, productName: string) {
  const normalizedName = slugify(productName);
  if (normalizedName) {
    return normalizedName;
  }

  const normalizedCode = slugify(productCode);
  return normalizedCode ? normalizedCode : `product-${Date.now()}`;
}

function toCsvRow(headers: string[], row: string[]): CsvRow | null {
  const getValue = (key: keyof typeof REQUIRED_HEADERS) => {
    const headerName = REQUIRED_HEADERS[key];
    const index = headers.indexOf(headerName);
    return index >= 0 ? row[index] ?? "" : "";
  };

  return {
    city: getValue("city"),
    store: getValue("store"),
    productName: getValue("productName"),
    productCode: getValue("productCode"),
    retailPrice: getValue("retailPrice"),
    promoPrice: getValue("promoPrice"),
  };
}

function sanitizeCopyValue(value: string | null | undefined) {
  if (!value) {
    return "\\N";
  }

  return value
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();
}

function formatArray(values: string[]) {
  if (!values.length) {
    return "";
  }

  return values.join(",");
}

function requireArgValue(args: string[], flag: string) {
  const index = args.indexOf(flag);
  if (index < 0 || index + 1 >= args.length) {
    return null;
  }

  return args[index + 1];
}

function parseRecordedAt(value: string) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : value;
}

async function listCsvFiles(targetPath: string) {
  const stats = await fs.promises.stat(targetPath);
  if (stats.isFile()) {
    return targetPath.toLowerCase().endsWith(".csv") ? [targetPath] : [];
  }

  if (!stats.isDirectory()) {
    return [];
  }

  const entries = await fs.promises.readdir(targetPath, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await listCsvFiles(entryPath);
      results.push(...nested);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".csv")) {
      results.push(entryPath);
    }
  }

  return results;
}

async function writeRow(
  stream: NodeJS.WritableStream,
  row: ImportRow,
  counters: { rows: number }
) {
  const line = [
    sanitizeCopyValue(row.storeId),
    sanitizeCopyValue(row.storeName),
    sanitizeCopyValue(row.storeCity ?? null),
    sanitizeCopyValue(row.productId),
    sanitizeCopyValue(row.productSlug),
    sanitizeCopyValue(row.productName),
    sanitizeCopyValue(row.productDescription),
    sanitizeCopyValue(formatArray(row.productCategories)),
    sanitizeCopyValue(row.canonicalKey ?? null),
    sanitizeCopyValue(row.priceId),
    row.amount.toString(),
    row.isPromo ? "true" : "false",
    sanitizeCopyValue(row.recordedAt),
    sanitizeCopyValue(row.source),
  ].join("\t");

  counters.rows += 1;

  if (!stream.write(`${line}\n`)) {
    await new Promise<void>((resolve) => stream.once("drain", resolve));
  }
}

async function processCsvFile(options: {
  filePath: string;
  recordedAt: string;
  storeIdCache: Map<string, string>;
  productIdCache: Map<string, string>;
  stream: NodeJS.WritableStream;
  counters: { rows: number; files: number; skipped: number };
}) {
  const fileStream = fs.createReadStream(options.filePath, { encoding: "utf-8" });
  const lineReader = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  let headers: string[] | null = null;
  const source = path.basename(options.filePath);

  for await (const line of lineReader) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (!headers) {
      headers = parseCsvLine(trimmed);
      const missingHeaders = Object.values(REQUIRED_HEADERS).filter(
        (header) => !headers?.includes(header)
      );

      if (missingHeaders.length) {
        throw new Error(`Missing headers in ${source}: ${missingHeaders.join(", ")}`);
      }

      continue;
    }

    const row = toCsvRow(headers, parseCsvLine(trimmed));
    if (!row?.productName || !row.store) {
      options.counters.skipped += 1;
      continue;
    }

    const promoAmount = parsePrice(row.promoPrice);
    const retailAmount = parsePrice(row.retailPrice);
    const amount = promoAmount ?? retailAmount;
    if (amount === null || amount <= 0) {
      options.counters.skipped += 1;
      continue;
    }
    const isPromo = promoAmount !== null && promoAmount > 0;

    const normalizedCity = normalizeCity(row.city, row.store);
    const storeKey = `${row.store.trim()}|${normalizedCity ?? ""}`;
    let storeId = options.storeIdCache.get(storeKey);
    if (!storeId) {
      storeId = randomUUID();
      options.storeIdCache.set(storeKey, storeId);
    }

    const normalizedName = normalizeProductName(row.productName);
    const slug = buildSlug(row.productCode, normalizedName);
    const canonicalKey = buildCanonicalKey(normalizedName);
    let productId = options.productIdCache.get(slug);
    if (!productId) {
      productId = randomUUID();
      options.productIdCache.set(slug, productId);
    }

    const description = normalizedName;
    const categories = getProductCategories(normalizedName, description);

    await writeRow(options.stream, {
      storeId,
      storeName: row.store.trim(),
      storeCity: normalizedCity,
      productId,
      productSlug: slug,
      productName: normalizedName,
      productDescription: description,
      productCategories: categories,
      canonicalKey,
      priceId: randomUUID(),
      amount,
      isPromo,
      recordedAt: options.recordedAt,
      source,
    }, options.counters);
  }

  options.counters.files += 1;
}

async function ensureStagingTable(client: Client) {
  await client.query(`
    CREATE UNLOGGED TABLE IF NOT EXISTS csv_price_staging (
      store_id TEXT,
      store_name TEXT,
      store_city TEXT,
      product_id TEXT,
      product_slug TEXT,
      product_name TEXT,
      product_description TEXT,
      product_categories TEXT,
      canonical_key TEXT,
      price_id TEXT,
      amount NUMERIC,
      is_promo BOOLEAN,
      recorded_at DATE,
      source TEXT
    );
  `);

  await client.query("TRUNCATE csv_price_staging;");
}

async function upsertFromStaging(client: Client) {
  await client.query("BEGIN");
  try {
    await client.query(`
      INSERT INTO "Store" ("id", "name", "city", "createdAt", "updatedAt")
      SELECT DISTINCT ON (s.store_name, s.store_city)
        s.store_id,
        s.store_name,
        s.store_city,
        NOW(),
        NOW()
      FROM csv_price_staging s
      LEFT JOIN "Store" existing
        ON existing.name = s.store_name
        AND existing.city IS NOT DISTINCT FROM s.store_city
      WHERE existing.id IS NULL;
    `);

    await client.query(`
      INSERT INTO "Product" ("id", "slug", "name", "description", "categories", "canonicalKey", "createdAt", "updatedAt")
      SELECT DISTINCT ON (s.product_slug)
        s.product_id,
        s.product_slug,
        s.product_name,
        s.product_description,
        string_to_array(s.product_categories, ','),
        s.canonical_key,
        NOW(),
        NOW()
      FROM csv_price_staging s
      ON CONFLICT ("slug") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "categories" = EXCLUDED."categories",
        "canonicalKey" = EXCLUDED."canonicalKey",
        "updatedAt" = NOW();
    `);

    await client.query(`
      INSERT INTO "Price" ("id", "amount", "currency", "recordedAt", "productId", "storeId", "source", "isPromo")
      SELECT
        s.price_id,
        s.amount::double precision,
        'EUR',
        s.recorded_at::timestamp,
        p.id,
        st.id,
        s.source,
        COALESCE(s.is_promo, false)
      FROM csv_price_staging s
      JOIN "Product" p ON p.slug = s.product_slug
      JOIN "Store" st ON st.name = s.store_name AND st.city IS NOT DISTINCT FROM s.store_city
      ON CONFLICT ("id") DO NOTHING;
    `);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetPath = requireArgValue(args, "--path") ?? requireArgValue(args, "-p");
  const recordedAtRaw = requireArgValue(args, "--date") ?? requireArgValue(args, "-d");

  if (!targetPath || !recordedAtRaw) {
    console.error("Usage: npm run import:csv -- --path <file-or-folder> --date YYYY-MM-DD");
    process.exit(1);
  }

  const recordedAt = parseRecordedAt(recordedAtRaw);
  if (!recordedAt) {
    console.error("Invalid --date value. Expected YYYY-MM-DD.");
    process.exit(1);
  }

  const csvFiles = await listCsvFiles(targetPath);
  if (!csvFiles.length) {
    console.error("No CSV files found for provided path.");
    process.exit(1);
  }

  const ssl = process.env.PGSSLINSECURE === "true" ? { rejectUnauthorized: false } : undefined;
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl });
  await client.connect();

  try {
    await ensureStagingTable(client);

    const copyStream = client.query(
      copyFrom(
        "COPY csv_price_staging (store_id, store_name, store_city, product_id, product_slug, product_name, product_description, product_categories, canonical_key, price_id, amount, is_promo, recorded_at, source) FROM STDIN WITH (FORMAT text, DELIMITER E'\\t', NULL '\\N')"
      )
    ) as unknown as NodeJS.WritableStream;

    const counters = { rows: 0, files: 0, skipped: 0 };
    const storeIdCache = new Map<string, string>();
    const productIdCache = new Map<string, string>();

    for (const filePath of csvFiles) {
      await processCsvFile({
        filePath,
        recordedAt,
        storeIdCache,
        productIdCache,
        stream: copyStream,
        counters,
      });
    }

    copyStream.end();
    await new Promise<void>((resolve, reject) => {
      copyStream.on("finish", resolve);
      copyStream.on("error", reject);
    });

    await upsertFromStaging(client);

    console.log(
      `Imported ${counters.rows} rows from ${counters.files} file(s). Skipped ${counters.skipped} rows.`
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Bulk CSV import failed:", error);
  process.exit(1);
});
