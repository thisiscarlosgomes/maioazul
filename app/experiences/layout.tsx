import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experiences",
  description:
    "Explore activities and outstanding proposals across the island of Maio.",
  alternates: { canonical: "/experiences" },
  openGraph: {
    title: "Experiences · MaioAzul",
    description:
      "Explore activities and outstanding proposals across the island of Maio.",
    url: "/experiences",
  },
};

export default function ExperiencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
