import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maio Data Dashboard",
  description:
    "Key indicators, tourism baselines, and local data for the island of Maio.",
  alternates: { canonical: "/dashboard" },
  openGraph: {
    title: "Maio Data Dashboard · MaioAzul",
    description:
      "Key indicators, tourism baselines, and local data for the island of Maio.",
    url: "/dashboard",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
