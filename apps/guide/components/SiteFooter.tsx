"use client";

import Link from "next/link";
import { Facebook, Instagram } from "lucide-react";
import { useLang } from "@/lib/lang";

const siteLinks = [
  { href: "/", key: "home" },
  { href: "/map", key: "map" },
  { href: "/places", key: "places" },
  { href: "/places", key: "attractions" },
  { href: "/experiences", key: "experiences" },
  { href: "/immigration-visas", key: "immigrationVisas" },
  { href: "/manifest", key: "manifest" },
  { href: "/guia-local", key: "guiaLocal" },
] as const;

export default function SiteFooter() {
  const [lang] = useLang();

  const copy = {
    en: {
      home: "Home",
      map: "Map",
      places: "Places",
      attractions: "Attractions",
      experiences: "Experiences",
      immigrationVisas: "Immigration & Visas",
      guiaLocal: "Guia de Negócios",
      manifest: "Manifest",
      website: "maioazul.com",
      facebook: "Maio Azul on Facebook",
      instagram: "Maio Azul on Instagram",
    },
    pt: {
      home: "Início",
      map: "Mapa",
      places: "Lugares",
      attractions: "Atrações",
      experiences: "Experiências",
      immigrationVisas: "Imigração & Vistos",
      guiaLocal: "Guia de Negócios",
      manifest: "Manifesto",
      website: "maioazul.com",
      facebook: "Maio Azul no Facebook",
      instagram: "Maio Azul no Instagram",
    },
  } as const;

  return (
    <footer className="border-t border-border/80 bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {siteLinks.map((item) => (
            <Link
              key={`${item.href}-${item.key}`}
              href={item.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {copy[lang][item.key]}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-start gap-3 md:justify-end">
          <a
            href="https://maioazul.com"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-foreground transition hover:opacity-80"
          >
            {copy[lang].website}
          </a>
          <a
            href="https://www.instagram.com/maio__azul"
            target="_blank"
            rel="noreferrer"
            aria-label={copy[lang].instagram}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=100091540795360"
            target="_blank"
            rel="noreferrer"
            aria-label={copy[lang].facebook}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <Facebook className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
