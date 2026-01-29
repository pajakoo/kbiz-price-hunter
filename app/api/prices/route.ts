import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

    return NextResponse.json({ ok: true, price }, { status: 201 });
  } catch (error) {
    console.error("Price create failed", error);
    return NextResponse.json(
      { ok: false, error: "Unable to create price." },
      { status: 500 }
    );
  }
}
