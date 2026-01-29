import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(getSessionCookieName());

  if (sessionCookie?.value) {
    await prisma.session.deleteMany({
      where: { token: sessionCookie.value },
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
