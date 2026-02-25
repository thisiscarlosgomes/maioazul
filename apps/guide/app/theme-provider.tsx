"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const theme =
      stored ??
      defaultTheme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

    document.documentElement.classList.toggle("dark", theme === "dark");
    if (!stored) {
      localStorage.setItem("theme", theme);
    }
    setMounted(true);
  }, [defaultTheme]);

  if (!mounted) return null;

  return <>{children}</>;
}
