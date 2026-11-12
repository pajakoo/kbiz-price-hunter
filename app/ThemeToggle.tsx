"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "kbiz-theme";

type Theme = "light" | "dark";
const THEME_CHANGE = "kbiz-theme-change";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribeToTheme(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(THEME_CHANGE, notify);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(THEME_CHANGE, notify);
    media.removeEventListener("change", notify);
  };
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getPreferredTheme,
    () => "light"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE));
  }

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme}>
      {theme === "light" ? "Dark" : "Light"} mode
    </button>
  );
}
