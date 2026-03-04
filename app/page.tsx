import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";

export const metadata: Metadata = {
  title: "Maio, at its own pace",
  description:
    "Discover Maio, Cabo Verde with a local-first guide to places, experiences, weather, travel context, and everyday island life.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Maio, at its own pace",
    description:
      "Discover Maio through local places, practical tools, and island context shared with care.",
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
      "Discover Maio through local places, practical tools, and island context shared with care.",
    images: ["/og2.jpg"],
  },
};

export default function Home() {
  return <HomeClient />;
}
