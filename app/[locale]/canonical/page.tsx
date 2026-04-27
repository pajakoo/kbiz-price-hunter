import { redirect } from "next/navigation";

export default async function CanonicalRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const normalizedLocale = locale === "bg" ? "bg" : "en";
  redirect(`/${normalizedLocale}/dashboard/canonical`);
}
