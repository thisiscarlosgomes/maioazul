import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experiences",
  description:
    "Explore activities, local experiences, and ideas for discovering Maio with local context and practical details.",
  alternates: { canonical: "/experiences" },
  openGraph: {
    title: "Experiences · MaioAzul",
    description:
      "Explore activities and local experiences across Maio.",
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
