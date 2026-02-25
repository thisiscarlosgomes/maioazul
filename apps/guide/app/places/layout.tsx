import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Places",
  description:
    "Browse beaches, settlements, and protected areas across the island of Maio.",
  alternates: { canonical: "/places" },
  openGraph: {
    title: "Places · Visit Maio",
    description:
      "Browse beaches, settlements, and protected areas across the island of Maio.",
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
