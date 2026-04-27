const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline");
const { PrismaClient } = require("@prisma/client");

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && !databaseUrl.includes("pgbouncer=true")) {
  const separator = databaseUrl.includes("?") ? "&" : "?";
  process.env.DATABASE_URL = `${databaseUrl}${separator}pgbouncer=true`;
}

const prisma = new PrismaClient();

const REQUIRED_HEADERS = {
  city: "Населено място",
  store: "Търговски обект",
  productName: "Наименование на продукта",
  productCode: "Код на продукта",
  retailPrice: "Цена на дребно",
  promoPrice: "Цена в промоция",
};

const BULGARIAN_MAP = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sht",
  ъ: "a",
  ь: "y",
  ю: "yu",
  я: "ya",
};

const LEADING_PUNCTUATION = /^[,.;:]+/;
const CITY_PATTERN = /гр\.?\s*([A-Za-zА-Яа-я-]+(?:\s+[A-Za-zА-Яа-я-]+)*)/i;
const EKATTE_PATH = path.join(process.cwd(), "lib", "ekatte_regions.csv");

let cachedCityMap = null;

function normalizeProductName(value) {
  return value.trim().replace(LEADING_PUNCTUATION, "").trim();
}

function slugify(value) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const transliterated = normalized
    .split("")
    .map((char) => BULGARIAN_MAP[char] ?? char)
    .join("");

  return transliterated.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildSlug(productCode, productName) {
  const normalizedName = slugify(productName);
  if (normalizedName) {
    return normalizedName;
  }

  const normalizedCode = slugify(productCode);
  return normalizedCode ? normalizedCode : "";
}

function parseCsvLine(line) {
  const values = [];
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

function parsePrice(value) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isNaN(amount) ? null : amount;
}

function toCsvRow(headers, row) {
  const getValue = (key) => {
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

function cleanCity(value) {
  return value.split(/[,/]/)[0]?.trim() ?? "";
}

function loadCityMap() {
  if (cachedCityMap) {
    return cachedCityMap;
  }

  const map = new Map();
  try {
    const content = fs.readFileSync(EKATTE_PATH, "utf-8");
    const lines = content.split(/\r?\n/).filter(Boolean);
    lines.slice(1).forEach((line) => {
      const parts = line.split(",");
      const code = parts[0]?.trim();
      const name = parts[1]?.trim();
      if (code && name) {
        map.set(code, name);
      }
    });
  } catch {
    // ignore missing map
  }

  cachedCityMap = map;
  return map;
}

function lookupCityByCode(code) {
  const map = loadCityMap();
  return map.get(code) ?? null;
}

function extractCityFromStoreName(storeName) {
  const match = storeName.match(CITY_PATTERN);
  if (!match?.[1]) {
    return null;
  }
  const cleaned = cleanCity(match[1]);
  return cleaned || null;
}

function normalizeCity(rawCity, storeName) {
  const trimmedCity = rawCity?.trim() ?? "";
  if (trimmedCity && /[A-Za-zА-Яа-я]/.test(trimmedCity)) {
    return cleanCity(trimmedCity) || null;
  }

  const numericCity = trimmedCity && /^[0-9]+$/.test(trimmedCity);
  if (numericCity) {
    const mapped = lookupCityByCode(trimmedCity);
    if (mapped) {
      return mapped;
    }
  }

  if (!trimmedCity || numericCity) {
    return extractCityFromStoreName(storeName);
  }

  return cleanCity(trimmedCity) || null;
}

function extractRecordedAt(filePath) {
  const match = filePath.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) {
    return new Date();
  }

  const parsed = new Date(`${match[0]}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function listCsvFiles(root) {
  const entries = await fsp.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listCsvFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".csv")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function processCsvFile({
  filePath,
  productMap,
  storeCache,
  counters,
  priceRowMap,
  productIdsByDate,
}) {
  const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
  const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let headers = null;
  let hasRequiredHeaders = false;
  const recordedAt = extractRecordedAt(filePath);
  const dateKey = recordedAt.toISOString().slice(0, 10);
  const source = path.basename(filePath, path.extname(filePath));

  try {
    for await (const line of reader) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      const values = parseCsvLine(trimmed);
      if (!headers) {
        const missingHeaders = Object.values(REQUIRED_HEADERS).filter(
          (header) => !values.includes(header)
        );
        if (missingHeaders.length) {
          counters.missingHeaders += 1;
          return;
        }
        headers = values;
        hasRequiredHeaders = true;
        continue;
      }

      if (!hasRequiredHeaders) {
        return;
      }

      const row = toCsvRow(headers, values);
      if (!row?.productName || !row.store) {
        counters.skippedRows += 1;
        continue;
      }

      const priceValue = parsePrice(row.promoPrice || row.retailPrice);
      if (priceValue === null || priceValue <= 0) {
        counters.skippedRows += 1;
        continue;
      }

      const normalizedName = normalizeProductName(row.productName);
      const slug = buildSlug(row.productCode, normalizedName);
      if (!slug) {
        counters.skippedRows += 1;
        continue;
      }

      const product = productMap.get(slug);
      if (!product) {
        counters.skippedProducts += 1;
        continue;
      }

      const normalizedCity = normalizeCity(row.city, row.store);
      const storeKey = `${row.store.trim()}|${normalizedCity ?? ""}`;
      let store = storeCache.get(storeKey);

      if (!store) {
        const existingStore = await prisma.store.findFirst({
          where: { name: row.store.trim(), city: normalizedCity },
        });

        const createdStore =
          existingStore ??
          (await prisma.store.create({
            data: {
              name: row.store.trim(),
              city: normalizedCity,
            },
          }));

        store = { id: createdStore.id };
        storeCache.set(storeKey, store);

        if (!existingStore) {
          counters.createdStores += 1;
        }
      }

      if (!productIdsByDate.has(dateKey)) {
        productIdsByDate.set(dateKey, new Set());
      }
      productIdsByDate.get(dateKey).add(product.id);

      const priceKey = `${product.id}|${store.id}|${recordedAt.toISOString()}`;
      priceRowMap.set(priceKey, {
        productId: product.id,
        storeId: store.id,
        amount: priceValue,
        currency: "EUR",
        recordedAt,
        source,
      });
    }
  } finally {
    reader.close();
    stream.destroy();
  }
}

async function main() {
  const dataRoot = path.join(process.cwd(), "data", "2026-02-16");
  const stat = await fsp.stat(dataRoot).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error(`Missing data folder: ${dataRoot}`);
  }

  const products = await prisma.product.findMany({
    select: { id: true, slug: true, name: true },
  });
  const productMap = new Map(products.map((product) => [product.slug, product]));
  const storeCache = new Map();
  const priceRowMap = new Map();
  const productIdsByDate = new Map();
  const counters = {
    updatedPrices: 0,
    skippedProducts: 0,
    skippedRows: 0,
    createdStores: 0,
    missingHeaders: 0,
  };

  const csvFiles = await listCsvFiles(dataRoot);
  for (const filePath of csvFiles) {
    await processCsvFile({
      filePath,
      productMap,
      storeCache,
      counters,
      priceRowMap,
      productIdsByDate,
    });
  }

  for (const [dateKey, productIds] of productIdsByDate) {
    const recordedAt = new Date(`${dateKey}T00:00:00Z`);
    await prisma.price.deleteMany({
      where: {
        recordedAt,
        productId: { in: Array.from(productIds) },
      },
    });
  }

  const priceRows = Array.from(priceRowMap.values());
  const batchSize = 1000;
  for (let i = 0; i < priceRows.length; i += batchSize) {
    await prisma.price.createMany({ data: priceRows.slice(i, i + batchSize) });
  }
  counters.updatedPrices = priceRows.length;

  console.log("Update complete.");
  console.log(`Updated prices: ${counters.updatedPrices}`);
  console.log(`Skipped rows: ${counters.skippedRows}`);
  console.log(`Skipped products (missing): ${counters.skippedProducts}`);
  console.log(`Created stores: ${counters.createdStores}`);
  console.log(`Files missing headers: ${counters.missingHeaders}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
