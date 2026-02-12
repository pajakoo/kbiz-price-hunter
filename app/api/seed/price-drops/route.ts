import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getProductCategories } from "@/lib/product-categories";
import { normalizeProductName } from "@/lib/product-normalize";

const FAKE_PRODUCTS = [
  {
    slug: "drop-test-shampoo",
    name: "Test Shampoo",
    prices: [24.9, 21.5, 19.2],
  },
  {
    slug: "drop-test-conditioner",
    name: "Test Conditioner",
    prices: [18.0, 17.2, 14.6],
  },
];

function buildDates() {
  const today = new Date();
  return [14, 7, 0].map((daysAgo) => {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    return date;
  });
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const existingStore = await prisma.store.findFirst({
    where: { name: "Drop Test Store", city: "Sofia" },
  });

  const store =
    existingStore ??
    (await prisma.store.create({
      data: { name: "Drop Test Store", city: "Sofia" },
    }));

  const dates = buildDates();
  let createdProducts = 0;
  let createdPrices = 0;

  for (const productSeed of FAKE_PRODUCTS) {
    const normalizedName = normalizeProductName(productSeed.name);
    const categories = getProductCategories(normalizedName, normalizedName);
    const product = await prisma.product.upsert({
      where: { slug: productSeed.slug },
      update: { name: normalizedName, description: normalizedName, categories },
      create: {
        slug: productSeed.slug,
        name: normalizedName,
        description: normalizedName,
        categories,
      },
    });

    if (product.createdAt.getTime() === product.updatedAt.getTime()) {
      createdProducts += 1;
    }

    await prisma.price.deleteMany({
      where: { productId: product.id, storeId: store.id },
    });

    const priceData = productSeed.prices.map((amount, index) => ({
      productId: product.id,
      storeId: store.id,
      amount,
      currency: "EUR",
      recordedAt: dates[index] ?? new Date(),
      source: "seed",
    }));

    await prisma.price.createMany({ data: priceData });
    createdPrices += priceData.length;
  }

  return NextResponse.json({
    ok: true,
    store: { id: store.id, name: store.name },
    createdProducts,
    createdPrices,
  });
}
