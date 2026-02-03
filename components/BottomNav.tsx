"use client";

import { Heart, Map, MapPinned } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/map", label: "Home", icon: Map },
  { href: "/places", label: "Places", icon: MapPinned },
  { href: "/favorites", label: "Favorites", icon: Heart },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.25rem)" }}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-around px-6 py-2">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-xs font-medium transition active:scale-[0.98] ${
                active
                  ? "text-maio-blue"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
