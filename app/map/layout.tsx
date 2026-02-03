import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map",
  description:
    "Explore Maio on an interactive map with beaches, settlements, protected areas, and trails.",
  alternates: { canonical: "/map" },
  openGraph: {
    title: "Map · MaioAzul",
    description:
      "Explore Maio on an interactive map with beaches, settlements, protected areas, and trails.",
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
