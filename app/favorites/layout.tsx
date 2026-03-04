import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Your saved Maio places and spots for quick access while planning or exploring the island.",
  alternates: { canonical: "/favorites" },
  openGraph: {
    title: "Favorites · MaioAzul",
    description: "Your saved Maio places and spots for quick access later.",
    url: "/favorites",
  },
};

export default function FavoritesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
