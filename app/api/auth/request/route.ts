import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { defaultLocale, locales } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MINUTES = 30;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const locale =
    typeof body?.locale === "string" && locales.includes(body.locale)
      ? body.locale
      : defaultLocale;

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
  }

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.magicLinkToken.create({
      data: {
        email: user.email,
        token,
        expiresAt,
      },
    });

    const headerList = await headers();
    const origin =
      headerList.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";
    const magicLink = `${origin}/api/auth/verify?token=${token}&locale=${locale}`;

    return NextResponse.json({
      ok: true,
      message:
        "Magic link generated. In production, this is emailed to the user.",
      magicLink,
    });
  } catch (error) {
    console.error("Magic link request failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to send magic link right now. Check database setup.",
      },
      { status: 500 }
    );
  }
}
