"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function localeFromPathname(pathname: string | null) {
  if (!pathname) {
    return "en";
  }

  return pathname.startsWith("/bg") ? "bg" : "en";
}

export default function HtmlLangSync() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = localeFromPathname(pathname);
  }, [pathname]);

  return null;
}
