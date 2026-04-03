import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maio Campanha Azul",
  description:
    "Campanha Azul 2026 da Maioazul: uma agenda de ação coletiva para um Maio mais azul, com proteção costeira, mobilização comunitária, economia local e parcerias de impacto.",
  alternates: {
    canonical: "/campanha-azul",
  },
  openGraph: {
    type: "website",
    url: "https://www.maioazul.com/campanha-azul",
    title: "Maio Campanha Azul",
    description:
      "Conheça a Campanha Azul 2026 e junte-se ao movimento por um Maio mais azul, dinâmico e sustentável.",
    images: [
      {
        url: "https://www.maioazul.com/campanha-azul/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Maio Campanha Azul",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Maio Campanha Azul",
    description:
      "Campanha Azul 2026: ação coletiva por um Maio mais azul, com proteção ambiental e desenvolvimento local.",
    images: ["https://www.maioazul.com/campanha-azul/twitter-image"],
  },
};

export default function CampanhaAzulLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
