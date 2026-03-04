import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maio Data Dashboard",
  description:
    "Key indicators, tourism baselines, and local transparency data for the island of Maio, Cabo Verde.",
  alternates: { canonical: "/dashboard" },
  openGraph: {
    title: "Maio Data Dashboard · MaioAzul",
    description:
      "Explore indicators, tourism baselines, and local transparency data for Maio.",
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
