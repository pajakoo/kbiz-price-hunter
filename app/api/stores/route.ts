import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const stores = await prisma.store.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, stores });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const city = typeof body?.city === "string" ? body.city.trim() : "";

  if (!name) {
    return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  }

  try {
    const store = await prisma.store.create({
      data: {
        name,
        city: city || null,
      },
    });

    return NextResponse.json({ ok: true, store }, { status: 201 });
  } catch (error) {
    console.error("Store create failed", error);
    return NextResponse.json(
      { ok: false, error: "Unable to create store." },
      { status: 500 }
    );
  }
}
