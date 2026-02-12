import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getProductCategories } from "@/lib/product-categories";
import { getProductCards } from "@/lib/product-list";
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

  if (!slug || !name) {
    return NextResponse.json(
      { ok: false, error: "Slug and name are required." },
      { status: 400 }
    );
  }

  try {
    const normalizedName = normalizeProductName(name);
    const normalizedDescription = description ? normalizeProductName(description) : null;
    const categories = getProductCategories(normalizedName, normalizedDescription);
    const product = await prisma.product.create({
      data: {
        slug,
        name: normalizedName,
        description: normalizedDescription,
        categories,
      },
    });

    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (error) {
    console.error("Product create failed", error);
    return NextResponse.json(
      { ok: false, error: "Unable to create product." },
      { status: 500 }
    );
  }
}
