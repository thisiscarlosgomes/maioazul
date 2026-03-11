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
  twitter: {
    card: "summary_large_image",
    title: "Places · Visit Maio",
    description:
      "Browse beaches, settlements, and protected areas across the island of Maio.",
    images: ["https://www.visit-maio.com/cover.jpg"],
  },
};

export default function PlacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
