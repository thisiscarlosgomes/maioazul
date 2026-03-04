import type { Metadata } from "next";

const siteUrl = "https://www.maioazul.com";
const pageUrl = `${siteUrl}/partners`;
const ogImage = `${siteUrl}/coverpartners.jpg`;
const title = "Partnerships";
const description =
  "Partner with MaioAzul on Maio, Cabo Verde: local-first collaborations in sport, culture, community, and long-term island development.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    type: "website",
    url: pageUrl,
    siteName: "MaioAzul",
    title: `${title} · MaioAzul`,
    description,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "MaioAzul partnerships on the island of Maio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} · MaioAzul`,
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
