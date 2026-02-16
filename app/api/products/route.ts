import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getProductCategories } from "@/lib/product-categories";
import { getProductCards } from "@/lib/product-list";
import { normalizeCity } from "@/lib/city-normalize";
import { normalizeProductName } from "@/lib/product-normalize";
import type { Locale } from "@/lib/i18n";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageParam = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSizeParam = Number.parseInt(searchParams.get("pageSize") ?? "30", 10);
  const query = searchParams.get("q");
  const categoriesParam = searchParams.get("categories") ?? "";
  const localeParam = searchParams.get("locale") ?? "en";

  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0
    ? Math.min(pageSizeParam, 100)
    : 30;
  const categories = categoriesParam
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean);
  const locale: Locale = localeParam === "bg" ? "bg" : "en";

  const result = await getProductCards({
    locale,
    page,
    pageSize,
    query,
    categories,
  });

  return NextResponse.json({
    ok: true,
    products: result.products,
    total: result.total,
    page,
    pageSize,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : null;
  const storeName = typeof body?.storeName === "string" ? body.storeName.trim() : "";
  const storeCity = typeof body?.storeCity === "string" ? body.storeCity.trim() : "";
  const priceRaw = body?.price;
  const recordedAtRaw = typeof body?.recordedAt === "string" ? body.recordedAt.trim() : "";

  if (!slug || !name) {
    return NextResponse.json(
      { ok: false, error: "Slug and name are required." },
      { status: 400 }
    );
  }

  const hasPricing = Boolean(storeName || priceRaw || recordedAtRaw);
  const amount = typeof priceRaw === "number" ? priceRaw : Number.parseFloat(String(priceRaw ?? ""));
  const recordedAt = recordedAtRaw ? new Date(`${recordedAtRaw}T00:00:00Z`) : null;
  if (hasPricing) {
    if (!storeName) {
      return NextResponse.json(
        { ok: false, error: "Store name is required." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Valid price amount is required." },
        { status: 400 }
      );
    }
    if (!recordedAtRaw || !recordedAt || Number.isNaN(recordedAt.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Recorded date is required." },
        { status: 400 }
      );
    }
  }

  try {
    const normalizedName = normalizeProductName(name);
    const normalizedDescription = description ? normalizeProductName(description) : null;
    const categories = getProductCategories(normalizedName, normalizedDescription);
    const normalizedCity = storeCity ? normalizeCity(storeCity, storeName) : null;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          slug,
          name: normalizedName,
          description: normalizedDescription,
          categories,
        },
      });

      if (hasPricing && recordedAt) {
        let store = await tx.store.findFirst({
          where: { name: storeName, city: normalizedCity },
        });
        if (!store) {
          store = await tx.store.create({
            data: { name: storeName, city: normalizedCity },
          });
        }

        await tx.price.create({
          data: {
            productId: product.id,
            storeId: store.id,
            amount,
            currency: "EUR",
            recordedAt,
          },
        });
      }

      return product;
    });

    return NextResponse.json({ ok: true, product: result }, { status: 201 });
  } catch (error) {
    console.error("Product create failed", error);
    return NextResponse.json(
      { ok: false, error: "Unable to create product." },
      { status: 500 }
    );
  }
}
