import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Things to Do",
  description:
    "Activities and local happenings in Maio, ordered by date so visitors can plan their stay.",
  openGraph: {
    title: "Things to Do | Visit Maio",
    description:
      "Activities and local happenings in Maio, ordered by date so visitors can plan their stay.",
    url: "https://www.visit-maio.com/things-to-do",
    siteName: "Visit Maio",
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "https://www.visit-maio.com/things-to-do",
  },
};

export default function ThingsToDoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
