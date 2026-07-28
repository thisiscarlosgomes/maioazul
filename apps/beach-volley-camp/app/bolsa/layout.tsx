import type { Metadata } from "next";

const siteUrl = "https://mbv.maioazul.com";
const pageUrl = `${siteUrl}/bolsa`;
const ogImage = `${siteUrl}/og-camp.jpg`;
const title = "Bolsa";
const description =
  "Candidatura a bolsa para o Maio Beach Volley Camp na Ilha do Maio (agosto 2026): envia os teus dados para análise e resposta da equipa.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    type: "website",
    url: pageUrl,
    siteName: "Maio Beach Volley Camp",
    title: `${title} | Maio Beach Volley Camp`,
    description,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Bolsa Maio Beach Volley Camp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | Maio Beach Volley Camp`,
    description,
    images: [ogImage],
  },
};

export default function BolsaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
