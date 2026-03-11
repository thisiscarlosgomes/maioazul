import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sports & Surf Conditions",
  description:
    "Check live surf and sea conditions on Maio for safer, better-timed water activities.",
  alternates: { canonical: "/sports" },
  openGraph: {
    title: "Sports & Surf Conditions · Visit Maio",
    description:
      "Check live surf and sea conditions on Maio for safer, better-timed water activities.",
    url: "/sports",
    images: [
      {
        url: "https://www.visit-maio.com/cover.jpg",
        width: 1200,
        height: 630,
        alt: "Surf and sports conditions on Maio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sports & Surf Conditions · Visit Maio",
    description:
      "Check live surf and sea conditions on Maio for safer, better-timed water activities.",
    images: ["https://www.visit-maio.com/cover.jpg"],
  },
};

export default function SportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
