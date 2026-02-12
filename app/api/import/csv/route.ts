import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handlePriceDropAlert } from "@/lib/price-alerts";
import { getProductCategories } from "@/lib/product-categories";
import { normalizeCity } from "@/lib/city-normalize";
import { normalizeProductName } from "@/lib/product-normalize";

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

function parseCsv(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
}

function normalizeCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildSlug(productCode: string, productName: string) {
  const normalizedCode = normalizeCode(productCode);
  if (normalizedCode) {
    return `zlatna-${normalizedCode}`;
  }

  const normalizedName = normalizeCode(productName);
  return normalizedName ? `zlatna-${normalizedName}` : `zlatna-${Date.now()}`;
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

  const content = await file.text();
  const rows = parseCsv(content);
  const source = file.name.trim() || null;

  if (rows.length < 2) {
    return NextResponse.json({ ok: false, error: "CSV file has no rows." }, { status: 400 });
  }

  const headers = rows[0];
  const missingHeaders = Object.values(REQUIRED_HEADERS).filter(
    (header) => !headers.includes(header)
  );

  if (missingHeaders.length) {
    return NextResponse.json(
      { ok: false, error: `Missing headers: ${missingHeaders.join(", ")}` },
      { status: 400 }
    );
  }

  let createdStores = 0;
  let createdProducts = 0;
  let createdPrices = 0;
  let firstProduct: { slug: string; name: string } | null = null;

  const storeCache = new Map<string, { id: string }>();
  const productCache = new Map<string, { id: string; slug: string; name: string }>();

  for (const rawRow of rows.slice(1)) {
    const row = toCsvRow(headers, rawRow);
    if (!row?.productName || !row.store) {
      continue;
    }

    const priceValue = parsePrice(row.promoPrice || row.retailPrice);
    if (priceValue === null || priceValue <= 0) {
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
        createdStores += 1;
      }
    }

    const normalizedName = normalizeProductName(row.productName);
    const slug = buildSlug(row.productCode, normalizedName);
    let product = productCache.get(slug);

    if (!product) {
      const existingProduct = await prisma.product.findUnique({ where: { slug } });
      const description = normalizedName;
      const categories = getProductCategories(normalizedName, description);
      const upsertedProduct = existingProduct
        ? await prisma.product.update({
            where: { slug },
            data: {
              name: normalizedName,
              description,
              categories,
            },
          })
        : await prisma.product.create({
            data: {
              slug,
              name: normalizedName,
              description,
              categories,
            },
          });

      if (!existingProduct) {
        createdProducts += 1;
      }

      product = { id: upsertedProduct.id, slug: upsertedProduct.slug, name: upsertedProduct.name };
      productCache.set(slug, product);
    }

    if (!firstProduct) {
      firstProduct = { slug: product.slug, name: product.name };
    }

    const createdPrice = await prisma.price.create({
      data: {
        productId: product.id,
        storeId: store.id,
        amount: priceValue,
        currency: "EUR",
        recordedAt,
        source,
      },
      include: {
        product: true,
        store: true,
      },
    });


    await handlePriceDropAlert({
      product: { id: product.id, name: product.name, slug: product.slug },
      store: { id: store.id, name: row.store.trim() },
      newPrice: {
        amount: createdPrice.amount,
        currency: createdPrice.currency,
        recordedAt: createdPrice.recordedAt,
      },
    });

    createdPrices += 1;
  }

  return NextResponse.json({
    ok: true,
    createdStores,
    createdProducts,
    createdPrices,
    firstProduct,
  });
}
