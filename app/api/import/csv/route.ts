import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { from as copyFrom } from "pg-copy-streams";
import { getSession } from "@/lib/auth";
import { getProductCategories } from "@/lib/product-categories";
import { buildCanonicalKey } from "@/lib/canonical-key";

export const runtime = "nodejs";
import { normalizeCity } from "@/lib/city-normalize";
import { normalizeProductName } from "@/lib/product-normalize";
import { slugify } from "@/lib/slugify";

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
  source: string | null;
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

function buildSlug(productCode: string, productName: string) {
  const normalizedName = slugify(productName);
  if (normalizedName) {
    return normalizedName;
  }

  const normalizedCode = slugify(productCode);
  return normalizedCode ? normalizedCode : `product-${Date.now()}`;
}

function parsePrice(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isNaN(amount) ? null : amount;
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

async function ensureStagingTable(client: Client) {
  await client.query(`
    CREATE TEMP TABLE IF NOT EXISTS csv_price_staging (
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

async function waitForCopy(stream: NodeJS.WritableStream) {
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
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

async function writeRow(stream: NodeJS.WritableStream, row: ImportRow) {
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
    sanitizeCopyValue(row.source ?? null),
  ].join("\t");

  if (!stream.write(`${line}\n`)) {
    await new Promise<void>((resolve) => stream.once("drain", resolve));
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "CSV file is required." }, { status: 400 });
  }

  const recordedAtRaw = String(formData.get("recordedAt") ?? "").trim();
  const recordedAt = recordedAtRaw ? new Date(`${recordedAtRaw}T00:00:00Z`) : null;

  if (!recordedAt || Number.isNaN(recordedAt.getTime())) {
    return NextResponse.json(
      { ok: false, error: "Recorded date is required." },
      { status: 400 }
    );
  }

  const source = file.name.trim() || null;
  const content = await file.text();
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return NextResponse.json({ ok: false, error: "CSV file has no rows." }, { status: 400 });
  }

  const headers = parseCsvLine(lines[0]);
  const missingHeaders = Object.values(REQUIRED_HEADERS).filter(
    (header) => !headers.includes(header)
  );

  if (missingHeaders.length) {
    return NextResponse.json(
      { ok: false, error: `Missing headers: ${missingHeaders.join(", ")}` },
      { status: 400 }
    );
  }

  let firstProduct: { slug: string; name: string } | null = null;
  const storeIdCache = new Map<string, string>();
  const productIdCache = new Map<string, string>();
  const counters = { rows: 0, skipped: 0 };

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

    for (const line of lines.slice(1)) {
      const row = toCsvRow(headers, parseCsvLine(line));
      if (!row?.productName || !row.store) {
        counters.skipped += 1;
        continue;
      }

      const promoAmount = parsePrice(row.promoPrice);
      const retailAmount = parsePrice(row.retailPrice);
      const amount = promoAmount ?? retailAmount;
      if (amount === null || amount <= 0) {
        counters.skipped += 1;
        continue;
      }
      const isPromo = promoAmount !== null && promoAmount > 0;

      const normalizedCity = normalizeCity(row.city, row.store);
      const storeKey = `${row.store.trim()}|${normalizedCity ?? ""}`;
      let storeId = storeIdCache.get(storeKey);
      if (!storeId) {
        storeId = randomUUID();
        storeIdCache.set(storeKey, storeId);
      }

      const normalizedName = normalizeProductName(row.productName);
      const slug = buildSlug(row.productCode, normalizedName);
      const canonicalKey = buildCanonicalKey(normalizedName);
      let productId = productIdCache.get(slug);
      if (!productId) {
        productId = randomUUID();
        productIdCache.set(slug, productId);
      }

      if (!firstProduct) {
        firstProduct = { slug, name: normalizedName };
      }

      await writeRow(copyStream, {
        storeId,
        storeName: row.store.trim(),
        storeCity: normalizedCity,
        productId,
        productSlug: slug,
        productName: normalizedName,
        productDescription: normalizedName,
        productCategories: getProductCategories(normalizedName, normalizedName),
        canonicalKey,
        priceId: randomUUID(),
        amount,
        isPromo,
        recordedAt: recordedAtRaw,
        source,
      });

      counters.rows += 1;
    }

    copyStream.end();
    await waitForCopy(copyStream);

    await upsertFromStaging(client);
    // TODO: Re-add price-drop alerts for bulk imports.

    return NextResponse.json({
      ok: true,
      createdStores: storeIdCache.size,
      createdProducts: productIdCache.size,
      createdPrices: counters.rows,
      firstProduct,
      skippedRows: counters.skipped,
    });
  } catch (error) {
    console.error("Bulk CSV import failed", error);
    return NextResponse.json(
      { ok: false, error: "Bulk import failed. Check server logs." },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
