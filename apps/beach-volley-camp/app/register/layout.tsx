import type { Metadata } from "next";

const siteUrl = "https://mbv.maioazul.com";
const pageUrl = `${siteUrl}/register`;
const ogImage = `${siteUrl}/og-camp.jpg`;
const title = "Inscrições";
const description =
  "Inscrições para o Maio Beach Volley Camp na Ilha do Maio (agosto 2026): reserva a tua vaga para treino profissional, jogos, alojamento e experiências locais. Vagas limitadas.";

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
        alt: "Inscrição Maio Beach Volley Camp",
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

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
