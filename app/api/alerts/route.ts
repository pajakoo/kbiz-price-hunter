import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const subscriptions = await prisma.priceAlertSubscription.findMany({
    where: { userId: session.user.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    subscriptions: subscriptions.map(
      (subscription: { id: string; productId: string; product: { name: string; slug: string } }) => ({
        id: subscription.id,
        productId: subscription.productId,
        productName: subscription.product.name,
        productSlug: subscription.product.slug,
      })
    ),
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

  if (!productId && !productSlug) {
    return NextResponse.json(
      { ok: false, error: "productId or productSlug is required." },
      { status: 400 }
    );
  }

  const product = productId
    ? await prisma.product.findUnique({ where: { id: productId } })
    : await prisma.product.findUnique({ where: { slug: productSlug } });

  if (!product) {
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  }

  const existing = await prisma.priceAlertSubscription.findUnique({
    where: { userId_productId: { userId: session.user.id, productId: product.id } },
  });

  if (existing) {
    return NextResponse.json({ ok: true, subscriptionId: existing.id });
  }

  const subscription = await prisma.priceAlertSubscription.create({
    data: {
      userId: session.user.id,
      productId: product.id,
    },
  });

  return NextResponse.json({ ok: true, subscriptionId: subscription.id });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId.trim() : "";

  if (!productId) {
    return NextResponse.json({ ok: false, error: "productId is required." }, { status: 400 });
  }

  await prisma.priceAlertSubscription.deleteMany({
    where: { userId: session.user.id, productId },
  });

  return NextResponse.json({ ok: true });
}
