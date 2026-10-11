import type { Metadata } from "next";

export const SITE_URL = "https://www.maio.cv";
export const description = "Iniciativas digitais para a ilha do Maio, Cabo Verde: inteligência artificial, dados abertos, turismo e ferramentas para conhecer, investigar e aprender.";

export function pageMetadata(title: string, summary: string, path: string): Metadata {
  const url = new URL(path, SITE_URL).href;
  return {
    title,
    description: summary,
    alternates: { canonical: url },
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
      name: "MaioCV", url: SITE_URL, description, inLanguage: "pt",
      publisher: { "@id": `${SITE_URL}/#organization` },
      about: { "@type": "Place", name: "Ilha do Maio, Cabo Verde" },
    },
  ],
};
