import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { productId?: string } | null;
  const productId = body?.productId?.trim() ?? "";

  if (!productId) {
    return NextResponse.json({ ok: false, error: "Product id is required." }, { status: 400 });
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { canonicalKey: null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Exclude from canonical group failed", error);
    return NextResponse.json(
      { ok: false, error: "Unable to update product." },
      { status: 500 }
    );
  }
}
