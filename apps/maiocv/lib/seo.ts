import type { Metadata } from "next";
import { essentialsPath, LOCALES, localize, localeHreflang, localeOpenGraph, type Locale } from "./locale.ts";

export const SITE_URL = "https://www.maio.cv";
export const description = "Iniciativas digitais para a ilha do Maio, Cabo Verde: inteligência artificial, dados abertos, turismo e ferramentas para conhecer, investigar e aprender.";

const pagePaths = ["/", "/mcp", "/chat", "/essentials"] as const;

function localizedPath(locale: Locale, path: string): string {
  if (path === "/essentials") return essentialsPath(locale);
  return localize(locale, path);
}

export const publicRoutes = LOCALES.flatMap((lang) =>
  pagePaths.map((path) => ({ path: localizedPath(lang, path), lang })),
);

export const htmlLang = "pt";

export function languageAlternates(path: string) {
  const languages: Record<string, string> = {
    "x-default": new URL(localizedPath("pt", path), SITE_URL).href,
  };
  for (const locale of LOCALES) {
    languages[localeHreflang(locale)] = new URL(localizedPath(locale, path), SITE_URL).href;
  }
  return languages;
}

export function sitemapEntries() {
  return publicRoutes.map((route) => ({
    url: new URL(route.path, SITE_URL).href,
    alternates: { languages: languageAlternates(route.path) },
  }));
}

export function pageMetadata(title: string, summary: string, path: string, lang: Locale = "pt"): Metadata {
  const url = new URL(path, SITE_URL).href;
  return {
    title,
    description: summary,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      title,
      description: summary,
      url,
      siteName: "MaioCV",
      locale: localeOpenGraph(lang),
      type: "website",
      images: [{ url: `${SITE_URL}/slideshow/rotcha.png`, alt: "Praia da Bitxe Rotcha na ilha do Maio, Cabo Verde" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: summary,
      images: [`${SITE_URL}/slideshow/rotcha.png`],
    },
  };
}

export const siteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "MaioAzul",
      url: "https://maioazul.com",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "MaioCV",
      url: SITE_URL,
      description,
      inLanguage: htmlLang,
      publisher: { "@id": `${SITE_URL}/#organization` },
      about: { "@type": "Place", name: "Ilha do Maio, Cabo Verde" },
    },
  ],
};
