"use client";

import { Heart, Map, MapPinned, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { useVoiceState } from "@/lib/voice";
import { useLang } from "@/lib/lang";

export default function BottomNav() {
  const pathname = usePathname();
  const [lang] = useLang();
  const voiceState = useVoiceState();

  const copy = useMemo(
    () => ({
      en: {
        home: "Home",
        places: "Places",
        experiences: "Experiences",
        favorites: "Favorites",
      },
      pt: {
        home: "Início",
        places: "Lugares",
        experiences: "Experiências",
        favorites: "Favoritos",
      },
    }),
    []
  );

  const items = [
    { href: "/map", label: copy[lang].home, icon: Map },
    { href: "/places", label: copy[lang].places, icon: MapPinned },
    { href: "/experiences", label: copy[lang].experiences, icon: Sparkles },
    { href: "/favorites", label: copy[lang].favorites, icon: Heart },
  ];

  const markAutoResume = () => {
    if (typeof window === "undefined") return;
    if (voiceState.status === "playing") {
      window.localStorage.setItem("maio-voice-autoresume", String(Date.now()));
    }
  };

  return (
    <nav
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-6 py-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={markAutoResume}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition active:scale-[0.98] ${
                active
                  ? "text-maio-blue"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
