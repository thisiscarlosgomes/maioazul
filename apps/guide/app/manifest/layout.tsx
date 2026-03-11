import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Responsible Tourism Manifest",
  description:
    "Good-practice principles for respectful, low-impact travel on the island of Maio.",
  alternates: { canonical: "/manifest" },
  openGraph: {
    title: "Responsible Tourism Manifest · Visit Maio",
    description:
      "Good-practice principles for respectful, low-impact travel on the island of Maio.",
    url: "/manifest",
  },
};

export default function ManifestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
