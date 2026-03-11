import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cabo Verde eSIM",
  description:
    "Buy a Cabo Verde travel eSIM for Maio and stay connected during your trip.",
  alternates: { canonical: "/services/esim" },
  openGraph: {
    title: "Cabo Verde eSIM · Visit Maio",
    description:
      "Buy a Cabo Verde travel eSIM for Maio and stay connected during your trip.",
    url: "/services/esim",
  },
};

export default function EsimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
