import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizeCity } from "@/lib/city-normalize";

function shouldNormalize(city: string | null) {
  if (!city) {
    return true;
  }
  return /^[0-9]+$/.test(city.trim());
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const stores = await prisma.store.findMany({ select: { id: true, name: true, city: true } });
  let updated = 0;

  for (const store of stores) {
    if (!shouldNormalize(store.city)) {
      continue;
    }
    const normalizedCity = normalizeCity(store.city, store.name);
    if (normalizedCity !== store.city) {
      await prisma.store.update({ where: { id: store.id }, data: { city: normalizedCity } });
      updated += 1;
    }
  }

  return NextResponse.json({ ok: true, updated });
}
