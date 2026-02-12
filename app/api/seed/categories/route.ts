import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getProductCategories } from "@/lib/product-categories";
import { normalizeProductName } from "@/lib/product-normalize";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    select: { id: true, name: true, description: true },
  });

  let updated = 0;
  for (const product of products) {
    const normalizedName = normalizeProductName(product.name);
    const normalizedDescription = product.description
      ? normalizeProductName(product.description)
      : null;
    const categories = getProductCategories(normalizedName, normalizedDescription);
    await prisma.product.update({
      where: { id: product.id },
      data: { name: normalizedName, description: normalizedDescription, categories },
    });
    updated += 1;
  }

  return NextResponse.json({ ok: true, updated });
}
