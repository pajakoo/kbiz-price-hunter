type PriceDropEmail = {
  to: string;
  productName: string;
  productSlug: string;
  storeName: string;
  fromAmount: number;
  toAmount: number;
  currency: string;
  recordedAt: Date;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.ALERT_SITE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export async function sendPriceDropEmail(payload: PriceDropEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return { ok: false, skipped: true };
  }

  const baseUrl = getBaseUrl();
  const formattedDate = payload.recordedAt.toISOString().slice(0, 10);
  const subject = `Price drop: ${payload.productName}`;
  const body = `Price dropped for ${payload.productName} at ${payload.storeName} on ${formattedDate}.\nFrom ${payload.fromAmount} ${payload.currency} to ${payload.toAmount} ${payload.currency}.\n${baseUrl}/en/products/${payload.productSlug}`;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: payload.to,
      subject,
      text: body,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend email failed", errorText);
    return { ok: false, skipped: false };
  }

  return { ok: true, skipped: false };
}
