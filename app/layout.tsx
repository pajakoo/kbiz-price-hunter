import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Manrope, Sora } from "next/font/google";
import { Suspense } from "react";
import Analytics from "@/app/Analytics";
import HtmlLangSync from "@/app/HtmlLangSync";
import "./globals.css";

const headingFont = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-heading",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Ловец на цени",
  description:
    "Find the best grocery prices across stores with a simple, searchable catalog.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kbiz-price-hunter.example"
  ),
};

function normalizeSiteUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function normalizePath(pathname: string, locale: "en" | "bg") {
  if (!pathname || pathname === "/") {
    return `/${locale}`;
  }

  const withoutTrailingSlash = pathname !== "/" && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;

  if (withoutTrailingSlash.startsWith("/en") || withoutTrailingSlash.startsWith("/bg")) {
    return withoutTrailingSlash;
  }

  return `/${locale}${withoutTrailingSlash.startsWith("/") ? "" : "/"}${withoutTrailingSlash}`;
}

function toLocalePath(pathname: string, locale: "en" | "bg") {
  return pathname.replace(/^\/(en|bg)(?=\/|$)/, `/${locale}`);
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const siteUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kbiz-price-hunter.example"
  );
  const requestHeaders = await headers();
  const localeFromHeader = requestHeaders.get("x-locale") === "bg" ? "bg" : "en";
  const pathname = normalizePath(requestHeaders.get("x-pathname") ?? "", localeFromHeader);
  const canonicalUrl = `${siteUrl}${pathname}`;
  const enUrl = `${siteUrl}${toLocalePath(pathname, "en")}`;
  const bgUrl = `${siteUrl}${toLocalePath(pathname, "bg")}`;

  return (
    <html lang={localeFromHeader}>
      <head>
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="en" href={enUrl} />
        <link rel="alternate" hrefLang="bg" href={bgUrl} />
        <link rel="alternate" hrefLang="x-default" href={enUrl} />
      </head>
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <HtmlLangSync />
        {gaId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
window.gtag('js', new Date());
window.gtag('config', '${gaId}');`}
            </Script>
          </>
        ) : null}
        <Suspense fallback={null}>
          <Analytics gaId={gaId} />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
