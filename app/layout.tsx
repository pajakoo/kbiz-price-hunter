import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
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
  title: "Kbiz Price Hunter",
  description:
    "Find the best grocery prices across stores with a simple, searchable catalog.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kbiz-price-hunter.example"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
