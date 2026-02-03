import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";

export const metadata: Metadata = {
  title: "Maio, at its own pace",
  description:
    "A quiet, local-first guide to the island of Maio, Cabo Verde. A slower way to understand nature, people, and everyday life — built to last.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Maio, at its own pace",
    description:
      "A slower way to discover Maio. Rooted in local life, shared with care, and built to last.",
    url: "/",
    images: [
      {
        url: "/og2.jpg",
        width: 1200,
        height: 630,
        alt: "MaioAzul — Maio, at its own pace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Maio, at its own pace",
    description:
      "A slower way to discover Maio. Rooted in local life, shared with care, and built to last.",
    images: ["/og2.jpg"],
  },
};

export default function Home() {
  return <HomeClient />;
}
