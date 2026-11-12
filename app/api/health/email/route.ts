import { NextResponse } from "next/server";
import { getEmailProviderStatus } from "@/lib/resend";

export async function GET() {
  const status = getEmailProviderStatus();

  return NextResponse.json({
    ok: true,
    email: status,
  });
}
