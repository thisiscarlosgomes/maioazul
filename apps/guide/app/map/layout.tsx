import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map",
  description: "Interactive map of Maio with beaches, villages, and protected areas.",
  alternates: { canonical: "/map" },
  openGraph: {
    type: "website",
    title: "Map · Visit Maio",
    description: "Interactive map of Maio with beaches, villages, and protected areas.",
    url: "/map",
    siteName: "Visit Maio",
    images: [
      {
        url: "https://www.visit-maio.com/cover.jpg",
        width: 1200,
        height: 630,
        alt: "Visit Maio — Maio, at its own pace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Map · Visit Maio",
    description: "Interactive map of Maio with beaches, villages, and protected areas.",
    images: ["https://www.visit-maio.com/cover.jpg"],
  },
};

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
