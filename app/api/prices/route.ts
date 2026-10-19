import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handlePriceDropAlert } from "@/lib/price-alerts";
import { getStapleProduct } from "@/lib/staple-profiles";
import { MAX_COMPARISON_STORES } from "@/lib/store-comparison";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId")?.trim() ?? "";
  const productSlug = searchParams.get("productSlug")?.trim() ?? "";
  const canonicalKey = searchParams.get("canonicalKey")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  const selectedStoreIds = [...new Set(searchParams.getAll("storeId").map(value => value.trim()).filter(Boolean))];
  if (selectedStoreIds.length > MAX_COMPARISON_STORES || selectedStoreIds.some(id => id.length > 200)) {
    return NextResponse.json({ ok: false, error: "Select up to 5 valid store IDs." }, { status: 400 });
  }
  const maxPointsParam = Number.parseInt(searchParams.get("maxPoints") ?? "", 10);
  const maxPoints = Number.isFinite(maxPointsParam) && maxPointsParam > 0
    ? Math.min(maxPointsParam, 2000)
    : 1000;
  if (selectedStoreIds.length > maxPoints) {
    return NextResponse.json({ ok: false, error: "maxPoints must allow at least one observation per selected store." }, { status: 400 });
  }

  if (!productId && !productSlug && !canonicalKey) {
    return NextResponse.json(
      { ok: false, error: "productId, productSlug, or canonicalKey query param is required." },
      { status: 400 }
    );
  }

  const product = productId
    ? await prisma.product.findUnique({ where: { id: productId } })
    : productSlug
      ? await prisma.product.findUnique({ where: { slug: productSlug } })
      : null;

  const canonicalProducts = canonicalKey
    ? await prisma.product.findMany({
        where: { canonicalKey },
        select: { id: true, slug: true, name: true },
      })
    : [];

  if (!product && canonicalKey && canonicalProducts.length === 0) {
    return NextResponse.json({ ok: false, error: "Canonical key not found." }, { status: 404 });
  }

  if (!product && !canonicalKey) {
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  }

  const productIds = canonicalKey
    ? canonicalProducts.map((entry) => entry.id)
    : product
      ? [product.id]
      : [];

  const curated = Boolean(product && getStapleProduct(product.slug)) && !canonicalKey && !selectedStoreIds.length;
  // Explicit comparisons can span cities and are not restricted to the default top ten.
  const eligibleWhere = { productId: { in: productIds }, ...(selectedStoreIds.length
    ? { storeId: { in: selectedStoreIds } } : city ? { store: { city } } : {}) };
  const chartStores = curated ? await prisma.price.groupBy({ by: ["storeId"], where: eligibleWhere,
    _count: { id: true }, orderBy: [{ _count: { id: "desc" } }, { storeId: "asc" }], take: 10 }) : [];
  const priceQuery = {
    where: { ...eligibleWhere, ...(curated ? { storeId: { in: chartStores.map(s => s.storeId) } } : {}) },
    orderBy: [{ recordedAt: "desc" as const }, { id: "asc" as const }],
    take: maxPoints,
      select: {
        amount: true,
        recordedAt: true,
        storeId: true,
        source: true,
        isPromo: true,

      store: {
        select: { name: true, city: true },
      },
    },
  } as const;
  const prices = selectedStoreIds.length
    ? (await Promise.all(selectedStoreIds.map(storeId => prisma.price.findMany({
        ...priceQuery,
        where: { productId: { in: productIds }, storeId },
        orderBy: [{ recordedAt: "desc" }, { id: "asc" }],
        take: Math.max(1, Math.floor(maxPoints / selectedStoreIds.length)),
      })))).flat()
    : await prisma.price.findMany({ ...priceQuery, orderBy: [{ recordedAt: "desc" }, { id: "asc" }] });

  const series = prices.reduce<
    Record<
      string,
      {
        storeId: string;
        store: string;
        city: string | null;
        source?: string | null;
        points: { date: string; price: number; isPromo?: boolean }[];
      }
    >
  >((acc, price) => {
    const key = price.storeId;
    if (!acc[key]) {
      acc[key] = {
        storeId: price.storeId,
        store: price.store.name,
        city: price.store.city,
        source: price.source ?? null,
        points: [],
      };
    }
    acc[key].points.push({
      date: price.recordedAt.toISOString().slice(0, 10),
      price: price.amount,
      isPromo: price.isPromo ?? false,
    });
    return acc;
  }, {});

  const seriesValues = Object.values(series).map((entry) => ({
    ...entry,
    points: entry.points.sort((a, b) => a.date.localeCompare(b.date)),
  }));

  const responseProduct = product ?? canonicalProducts[0] ?? null;

  return NextResponse.json({
    ok: true,
    product: responseProduct
      ? { id: responseProduct.id, slug: responseProduct.slug, name: responseProduct.name }
      : null,
    canonicalKey: canonicalKey || null,
    productCount: canonicalKey ? productIds.length : 1,
    chartSelection: curated ? "Up to 10 stores with the most observations; all stores are listed in the comparison table." : null,
    series: seriesValues,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
  const productSlug = typeof body?.productSlug === "string" ? body.productSlug.trim() : "";
  const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
  const amount = typeof body?.amount === "number" ? body.amount : Number(body?.amount);
  const currency = typeof body?.currency === "string" ? body.currency.trim() : "EUR";
  const isPromo = typeof body?.isPromo === "boolean" ? body.isPromo : false;

  if ((!productId && !productSlug) || !storeId || Number.isNaN(amount)) {
    return NextResponse.json(
      { ok: false, error: "productId or productSlug, storeId, and amount are required." },
      { status: 400 }
    );
  }

  try {
    const product = productId
      ? await prisma.product.findUnique({ where: { id: productId } })
      : await prisma.product.findUnique({ where: { slug: productSlug } });

    if (!product) {
      return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return NextResponse.json({ ok: false, error: "Store not found." }, { status: 404 });
    }

      const price = await prisma.price.create({
        data: {
          amount,
          currency: currency || "EUR",
          productId: product.id,
          storeId: store.id,
          isPromo,
        },

      include: {
        product: true,
        store: true,
      },
    });

    await handlePriceDropAlert({
      product: { id: product.id, name: product.name, slug: product.slug },
      store: { id: store.id, name: store.name },
      newPrice: {
        amount: price.amount,
        currency: price.currency,
        recordedAt: price.recordedAt,
      },
    });

    return NextResponse.json({ ok: true, price }, { status: 201 });
  } catch (error) {
    console.error("Price create failed", error);
    return NextResponse.json(
      { ok: false, error: "Unable to create price." },
      { status: 500 }
    );
  }
}
