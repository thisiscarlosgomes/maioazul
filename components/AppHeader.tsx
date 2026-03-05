"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { Drawer } from "vaul";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Indicadores" },
  { href: "/orcamento", label: "Orçamento" },
  { href: "/documentos", label: "Documentos" },
  { href: "/feed", label: "Feed", hidden: true },
];

export default function AppHeader() {
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const openSparkles = () => {
    window.dispatchEvent(new CustomEvent("maio-open-sparkles"));
  };

  return (
    <header className="maio-app-header border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="truncate font-mono text-sm font-semibold uppercase tracking-[0.08em] text-foreground"
          >
            Portal de dados do Maio
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Drawer.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <Drawer.Trigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-sm text-foreground transition hover:bg-accent md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm md:hidden" />
              <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl border border-border bg-background p-4 pb-8 outline-none md:hidden">
                <Drawer.Title className="sr-only">Navigation</Drawer.Title>
                <nav className="mt-4 space-y-2">
                  {links.filter((item) => !item.hidden).map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block rounded-xl px-4 py-3 text-base transition ${
                          active
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    aria-label="Open sparkles insights"
                    title={
                      onDashboard
                        ? "Open insights"
                        : "Sparkles are available on Dashboard only"
                    }
                    disabled={!onDashboard}
                    onClick={() => {
                      openSparkles();
                      setMobileMenuOpen(false);
                    }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="h-5 w-5 text-amber-500" />
                  </button>
                  <ThemeToggle
                    className="cursor-pointer inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-foreground"
                    iconClassName="h-5 w-5"
                  />
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
          <nav className="hidden items-center gap-2 sm:gap-3 md:flex">
            {links.filter((item) => !item.hidden).map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2.5 py-1.5 text-sm transition ${
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            aria-label="Open sparkles insights"
            title={
              onDashboard
                ? "Open insights"
                : "Sparkles are available on Dashboard only"
            }
            disabled={!onDashboard}
            onClick={openSparkles}
            className="hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 md:inline-flex"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
          </button>
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
