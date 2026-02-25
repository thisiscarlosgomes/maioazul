import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map",
  description:
    "Experience Maio",
  alternates: { canonical: "/map" },
  openGraph: {
    type: "website",
    title: "Map · Visit Maio",
    description:
      "Experience Maio",
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
};

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
