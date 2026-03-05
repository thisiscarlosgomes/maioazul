"use client";

import { Sun, Moon } from "lucide-react";

type ThemeToggleProps = {
  className?: string;
  iconClassName?: string;
};

export function ThemeToggle({
  className,
  iconClassName,
}: ThemeToggleProps = {}) {
  function toggleTheme() {
    const isDark = document.documentElement.classList.contains("dark");
    const next = !isDark;

    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={
        className ??
        "cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground transition"
      }
    >
      <Sun className={`${iconClassName ?? "h-4 w-4"} hidden dark:block`} />
      <Moon className={`${iconClassName ?? "h-4 w-4"} dark:hidden`} />
    </button>
  );
}
