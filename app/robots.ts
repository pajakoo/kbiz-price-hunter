import type { MetadataRoute } from "next";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kbiz-price-hunter.example";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/en/dashboard", "/bg/dashboard"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
