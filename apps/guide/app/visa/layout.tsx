import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Immigration & Visas",
  description:
    "Overview of immigration and visa guidance for travelers visiting Maio, Cabo Verde.",
  openGraph: {
    title: "Immigration & Visas · Visit Maio",
    description:
      "General entry, immigration and visa guidance for traveling to Maio, Cabo Verde.",
  },
};

export default function ImmigrationVisasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
