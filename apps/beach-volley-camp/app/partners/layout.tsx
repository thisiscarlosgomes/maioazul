import type { Metadata } from "next";

const siteUrl = "https://mbv.maioazul.com";
const pageUrl = `${siteUrl}/partners`;
const ogImage = `${siteUrl}/coverpartners.jpg`;
const title = "Parcerias Maioazul";
const description =
  "Parcerias e patrocínio Maioazul na Ilha do Maio para marcas e instituições com foco em impacto local: desporto, cultura, comunidade, bolsas sociais e desenvolvimento de longo prazo.";

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
    title: `${title} | Ilha do Maio`,
    description,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Parcerias Maioazul na Ilha do Maio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | Ilha do Maio`,
    description,
    images: [ogImage],
  },
};

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
