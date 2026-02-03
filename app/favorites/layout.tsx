import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Your saved places across Maio for quick access later.",
  alternates: { canonical: "/favorites" },
  openGraph: {
    title: "Favorites · MaioAzul",
    description: "Your saved places across Maio for quick access later.",
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
