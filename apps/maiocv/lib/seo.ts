import type { Metadata } from "next";

export const SITE_URL = "https://www.maio.cv";
export const description = "Iniciativas digitais para a ilha do Maio, Cabo Verde: inteligência artificial, dados abertos, turismo e ferramentas para conhecer, investigar e aprender.";

export const publicRoutes = [
  { path: "/", lang: "pt" },
  { path: "/mcp", lang: "pt" },
  { path: "/chat", lang: "pt" },
] as const;

export const htmlLang = "pt" satisfies (typeof publicRoutes)[number]["lang"];

const hreflang: Record<string, string> = {
  pt: "pt-PT",
};

export function languageAlternates(path: string, lang: "pt" = "pt") {
  const url = new URL(path, SITE_URL).href;
  return {
    [hreflang[lang]]: url,
    "x-default": url,
  };
}

export function sitemapEntries() {
  return publicRoutes.map((route) => ({
    url: new URL(route.path, SITE_URL).href,
    alternates: { languages: languageAlternates(route.path, route.lang) },
  }));
}

export function pageMetadata(title: string, summary: string, path: string, lang: "pt" = "pt"): Metadata {
  const url = new URL(path, SITE_URL).href;
  return {
    title,
    description: summary,
    alternates: { canonical: url, languages: languageAlternates(path, lang) },
    openGraph: {
      title, description: summary, url, siteName: "MaioCV",
      locale: "pt_PT", type: "website",
      images: [{ url: `${SITE_URL}/slideshow/rotcha.png`, alt: "Praia da Bitxe Rotcha na ilha do Maio, Cabo Verde" }],
    },
    twitter: {
      card: "summary_large_image", title, description: summary,
      images: [`${SITE_URL}/slideshow/rotcha.png`],
    },
  };
}

export const siteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", "@id": `${SITE_URL}/#organization`,
      name: "MaioAzul", url: "https://maioazul.com",
    },
    {
      "@type": "WebSite", "@id": `${SITE_URL}/#website`,
      name: "MaioCV", url: SITE_URL, description, inLanguage: htmlLang,
      publisher: { "@id": `${SITE_URL}/#organization` },
      about: { "@type": "Place", name: "Ilha do Maio, Cabo Verde" },
    },
  ],
};
