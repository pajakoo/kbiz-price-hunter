import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";

function withLocale(locale: Locale, path: string) {
  return `/${locale}${path}`;
}

export function getLocaleAlternates(path: string, locale: Locale): Metadata["alternates"] {
  return {
    canonical: withLocale(locale, path),
    languages: {
      en: withLocale("en", path),
      bg: withLocale("bg", path),
      "x-default": withLocale("en", path),
    },
  };
}
