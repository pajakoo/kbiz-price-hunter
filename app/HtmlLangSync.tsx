"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function localeFromPathname(pathname: string | null) {
  if (!pathname) {
    return "bg";
  }

  return pathname.startsWith("/en") ? "en" : "bg";
}

export default function HtmlLangSync() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = localeFromPathname(pathname);
  }, [pathname]);

  return null;
}
