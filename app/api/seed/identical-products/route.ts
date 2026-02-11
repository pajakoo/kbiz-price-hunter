import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";
import readline from "node:readline";

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

type SourceRow = {
  row: CsvRow;
  price: number;
  recordedAt: Date;
  source: string;
};

type ProductBucket = {
  name: string;
  sources: Set<string>;
  rows: Map<string, SourceRow>;
};

function buildRowKey(row: CsvRow, recordedAt: Date) {
  const dateKey = recordedAt.toISOString().slice(0, 10);
  return `${row.store.trim()}|${row.city.trim()}|${dateKey}`;
}

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


function normalizeCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildSlug(name: string) {
  const normalizedName = normalizeCode(name);
  return normalizedName ? `identical-${normalizedName}` : `identical-${Date.now()}`;
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

function extractRecordedAt(filePath: string) {
  const match = filePath.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) {
    return new Date();
  }

  const parsed = new Date(`${match[0]}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function listCsvFiles(root: string) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

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

async function processCsvFile(
  filePath: string,
  products: Map<string, ProductBucket>
) {
  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers: string[] | null = null;
  let hasRequiredHeaders = false;
  const recordedAt = extractRecordedAt(filePath);
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
        continue;
      }

      const priceValue = parsePrice(row.promoPrice || row.retailPrice);
      if (priceValue === null || priceValue <= 0) {
        continue;
      }

      const bucket = bucketFor(products, row.productName);
      if (!bucket) {
        continue;
      }

      bucket.sources.add(source);
      const rowKey = buildRowKey(row, recordedAt);
      if (!bucket.rows.has(rowKey)) {
        bucket.rows.set(rowKey, { row, price: priceValue, recordedAt, source });
      }
    }
  } finally {
    reader.close();
    stream.destroy();
  }
}

function bucketFor(products: Map<string, ProductBucket>, name: string) {
  const normalized = normalizeName(name);
  if (!normalized) {
    return null;
  }

  const existing = products.get(normalized);
  if (existing) {
    return existing;
  }

  const bucket: ProductBucket = {
    name: name.trim(),
    sources: new Set(),
    rows: new Map(),
  };

  products.set(normalized, bucket);
  return bucket;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rootParam = searchParams.get("root")?.trim();
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 20;
  const baseRoot = process.cwd();
  const rootParts = rootParam ? rootParam.split(",").map((part) => part.trim()) : ["data"];
  const roots = rootParts.filter(Boolean).map((part) => path.resolve(baseRoot, part));

  if (!roots.length || roots.some((root) => !root.startsWith(baseRoot))) {
    return NextResponse.json({ ok: false, error: "Invalid root path." }, { status: 400 });
  }

  const missingRoots: string[] = [];
  for (const root of roots) {
    try {
      const stat = await fs.stat(root);
      if (!stat.isDirectory()) {
        missingRoots.push(root);
      }
    } catch {
      missingRoots.push(root);
    }
  }

  if (missingRoots.length) {
    return NextResponse.json(
      { ok: false, error: `Missing folder(s): ${missingRoots.join(", ")}` },
      { status: 400 }
    );
  }

  const csvFileSet = new Set<string>();
  for (const root of roots) {
    const files = await listCsvFiles(root);
    files.forEach((file) => csvFileSet.add(file));
  }
  const csvFiles = Array.from(csvFileSet);

  const products = new Map<string, ProductBucket>();

  for (const filePath of csvFiles) {
    await processCsvFile(filePath, products);
  }

  const candidates = Array.from(products.values())
    .filter((bucket) => bucket.sources.size >= 2)
    .sort((a, b) => {
      if (a.sources.size !== b.sources.size) {
        return b.sources.size - a.sources.size;
      }
      return a.name.localeCompare(b.name, "bg");
    })
    .slice(0, limit);

  let createdStores = 0;
  let createdProducts = 0;
  let createdPrices = 0;

  const storeCache = new Map<string, { id: string }>();

  for (const bucket of candidates) {
    const slug = buildSlug(bucket.name);
    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name: bucket.name,
        description: bucket.name,
      },
      create: {
        slug,
        name: bucket.name,
        description: bucket.name,
      },
    });

    if (!existingProduct) {
      createdProducts += 1;
    }

    for (const sourceRow of bucket.rows.values()) {
      const storeKey = `${sourceRow.row.store.trim()}|${sourceRow.row.city.trim()}`;
      let store = storeCache.get(storeKey);

      if (!store) {
        const existingStore = await prisma.store.findFirst({
          where: {
            name: sourceRow.row.store.trim(),
            city: sourceRow.row.city.trim() || null,
          },
        });

        const createdStore =
          existingStore ??
          (await prisma.store.create({
            data: {
              name: sourceRow.row.store.trim(),
              city: sourceRow.row.city.trim() || null,
            },
          }));

        store = { id: createdStore.id };
        storeCache.set(storeKey, store);

        if (!existingStore) {
          createdStores += 1;
        }
      }

      await prisma.price.deleteMany({
        where: {
          productId: product.id,
          storeId: store.id,
          recordedAt: sourceRow.recordedAt,
        },
      });

      await prisma.price.create({
        data: {
          productId: product.id,
          storeId: store.id,
          amount: sourceRow.price,
          currency: "EUR",
          recordedAt: sourceRow.recordedAt,
        },
      });

      createdPrices += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    createdStores,
    createdProducts,
    createdPrices,
    products: candidates.map((bucket) => {
      const dateKeys = new Set(
        Array.from(bucket.rows.values()).map((entry) => entry.recordedAt.toISOString().slice(0, 10))
      );
      return {
        name: bucket.name,
        sources: bucket.sources.size,
        dates: dateKeys.size,
      };
    }),
  });
}
