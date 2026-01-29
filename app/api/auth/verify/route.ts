import { NextResponse } from "next/server";
import crypto from "crypto";
import { defaultLocale, locales } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName } from "@/lib/auth";

const SESSION_TTL_DAYS = 7;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const localeParam = searchParams.get("locale");
  const locale =
    localeParam && locales.includes(localeParam as (typeof locales)[number])
      ? localeParam
      : defaultLocale;

  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  const magicToken = await prisma.magicLinkToken.findUnique({
    where: { token },
  });

  if (!magicToken || magicToken.usedAt || magicToken.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 400 });
  }

  await prisma.magicLinkToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  const user = await prisma.user.findUnique({
    where: { email: magicToken.email },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      token: sessionToken,
      userId: user.id,
      expiresAt,
    },
  });

  const response = NextResponse.redirect(
    new URL(`/${locale}/dashboard`, request.url)
  );
  response.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
