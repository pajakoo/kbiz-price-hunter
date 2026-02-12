import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { handlePriceDropAlert } from "@/lib/price-alerts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId")?.trim() ?? "";
  const productSlug = searchParams.get("productSlug")?.trim() ?? "";

  if (!productId && !productSlug) {
    return NextResponse.json(
      { ok: false, error: "productId or productSlug query param is required." },
      { status: 400 }
    );
  }

  const product = productId
    ? await prisma.product.findUnique({ where: { id: productId } })
    : await prisma.product.findUnique({ where: { slug: productSlug } });

  if (!product) {
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  }

  const prices = await prisma.price.findMany({
    where: { productId: product.id },
    orderBy: { recordedAt: "asc" },
    include: { store: true },
  });

  const series = prices.reduce<
    Record<
      string,
      {
        store: string;
        city: string | null;
        source?: string | null;
        points: { date: string; price: number }[];
      }
    >
  >((acc, price) => {
    const key = price.storeId;
    if (!acc[key]) {
      acc[key] = {
        store: price.store.name,
        city: price.store.city,
        source: price.source ?? null,
        points: [],
      };
    }
    acc[key].points.push({
      date: price.recordedAt.toISOString().slice(0, 10),
      price: price.amount,
    });
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    product: { id: product.id, slug: product.slug, name: product.name },
    series: Object.values(series),
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
