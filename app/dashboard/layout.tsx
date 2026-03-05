import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

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
  return <div className={inter.className}>{children}</div>;
}
