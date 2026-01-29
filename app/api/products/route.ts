import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
    const product = await prisma.product.create({
      data: {
        slug,
        name,
        description: description || null,
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
