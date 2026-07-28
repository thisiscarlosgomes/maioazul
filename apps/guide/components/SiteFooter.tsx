"use client";

import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram } from "lucide-react";
import { useLang } from "@/lib/lang";

const siteLinks = [
  { href: "/", key: "home" },
  { href: "/places", key: "attractions" },
  { href: "/experiences", key: "experiences" },
  { href: "/visa", key: "immigrationVisas" },
  { href: "/manifest", key: "manifest" },
  { href: "/guia", key: "guiaLocal" },
] as const;

export default function SiteFooter() {
  const [lang] = useLang();
  const currentYear = new Date().getFullYear();

  const copy = {
    en: {
      links: "Links",
      contact: "Contact",
      brands: "Our Brands",
      followUs: "Follow Us",
      brandMaioazul: "Maioazul",
      brandDataPortal: "Data portal",
      brandBeachVolley: "Beach Volley",
      home: "Home",
      map: "Map",
      places: "Places",
      attractions: "Attractions",
      experiences: "Experiences",
      immigrationVisas: "Immigration & Visas",
      guiaLocal: "Guia de Negócios",
      manifest: "Manifest",
      emailLabel: "Email",
      locationLabel: "Location",
      location: "Vila do Porto Ingles, Maio",
      copyright: `© ${currentYear} Visit Maio. All rights reserved.`,
      facebook: "Maio Azul on Facebook",
      instagram: "Maio Azul on Instagram",
    },
    pt: {
      links: "Links",
      contact: "Contacto",
      brands: "Our Brands",
      followUs: "Siga-nos",
      brandMaioazul: "Maioazul",
      brandDataPortal: "Portal de Dados",
      brandBeachVolley: "Beach Volley",
      home: "Início",
      map: "Mapa",
      places: "Lugares",
      attractions: "Atrações",
      experiences: "Experiências",
      immigrationVisas: "Imigração & Vistos",
      guiaLocal: "Guia de Negócios",
      manifest: "Manifesto",
      emailLabel: "Email",
      locationLabel: "Localização",
      location: "Vila do Porto Ingles, Maio",
      copyright: `© ${currentYear} Visit Maio. Todos os direitos reservados.`,
      facebook: "Maio Azul no Facebook",
      instagram: "Maio Azul no Instagram",
    },
  } as const;
  const brandLinks = [
    { label: copy[lang].brandMaioazul, href: "https://maioazul.com" },
    { label: copy[lang].brandDataPortal, href: "https://maioazul.com/dashboard" },
    { label: copy[lang].brandBeachVolley, href: "https://mbv.maioazul.com" },
  ] as const;

  return (
    <footer className="bg-[#10069f] text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 md:gap-12">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/80">
              {copy[lang].links}
            </h3>
            <nav className="mt-4 flex flex-col gap-3">
              {siteLinks.map((item) => (
                <Link
                  key={`${item.href}-${item.key}`}
                  href={item.href}
                  className="text-base text-white/90 transition hover:text-white"
                >
                  {copy[lang][item.key]}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/80">
              {copy[lang].contact}
            </h3>
            <div className="mt-4 space-y-3 text-base leading-relaxed text-white/90">
              <p>
                <span className="font-medium text-white">
                  {copy[lang].emailLabel}:
                </span>{" "}
                <a
                  href="mailto:info@visitmaio.com"
                  className="underline decoration-white/40 underline-offset-4 transition hover:text-white hover:decoration-white"
                >
                  info@visitmaio.com
                </a>
              </p>
              <p>
                {copy[lang].location}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/80">
              {copy[lang].brands}
            </h3>
            <nav className="mt-4 flex flex-col gap-3">
              {brandLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-base text-white/90 transition hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="md:justify-self-end">
            <Image
              src="/visitmaio.svg"
              alt="Visit Maio"
              width={160}
              height={62}
              className="h-auto w-36 brightness-0 invert"
            />
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/80">
                {copy[lang].followUs}
              </h3>
              <div className="mt-4 flex items-center gap-3">
                <a
                  href="https://www.instagram.com/visitmaiocv"
                  target="_blank"
                  rel="noreferrer"
                  aria-label={copy[lang].instagram}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white/90 transition hover:border-white hover:text-white"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=100091540795360"
                  target="_blank"
                  rel="noreferrer"
                  aria-label={copy[lang].facebook}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white/90 transition hover:border-white hover:text-white"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/20 pt-6 text-sm text-white/70">
          {copy[lang].copyright}
        </div>
      </div>
    </footer>
  );
}
