"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const theme = defaultTheme ?? "light";

    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
    setMounted(true);
  }, [defaultTheme]);

  if (!mounted) return null;

  return <>{children}</>;
}
