import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Places",
  description:
    "Browse beaches, villages, landmarks, and protected areas across the island of Maio, Cabo Verde.",
  alternates: { canonical: "/places" },
  openGraph: {
    title: "Places · MaioAzul",
    description:
      "Browse beaches, villages, landmarks, and protected areas across Maio.",
    url: "/places",
  },
};

export default function PlacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
