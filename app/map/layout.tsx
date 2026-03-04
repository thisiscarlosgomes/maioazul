import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interactive Map",
  description:
    "Explore Maio on an interactive map with beaches, villages, protected areas, trails, and key places across the island.",
  alternates: { canonical: "/map" },
  openGraph: {
    title: "Interactive Map · MaioAzul",
    description:
      "Interactive map of Maio with beaches, villages, protected areas, trails, and key places.",
    url: "/map",
  },
};

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
