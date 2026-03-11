import type { Metadata } from "next";
import HomeLandingPage from "@/components/HomeLandingPage";

export const metadata: Metadata = {
  title: "Maio Island Travel Guide",
  description:
    "Plan your trip to Maio, Cabo Verde with local places, beaches, map routes, experiences, and practical island travel information.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Maio Island Travel Guide · Visit Maio",
    description:
      "Plan your trip to Maio, Cabo Verde with local places, beaches, map routes, experiences, and practical island travel information.",
    url: "/",
    images: [
      {
        url: "https://www.visit-maio.com/cover.jpg",
        width: 1200,
        height: 630,
        alt: "Visit Maio travel guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Maio Island Travel Guide · Visit Maio",
    description:
      "Plan your trip to Maio, Cabo Verde with local places, beaches, map routes, experiences, and practical island travel information.",
    images: ["https://www.visit-maio.com/cover.jpg"],
  },
};

export default function HomePage() {
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Visit Maio - Maio Island Travel Guide",
    url: "https://www.visit-maio.com/",
    description:
      "Plan your trip to Maio, Cabo Verde with local places, beaches, map routes, experiences, and practical island travel information.",
    about: {
      "@type": "TouristDestination",
      name: "Maio, Cabo Verde",
    },
    mainEntity: {
      "@type": "ItemList",
      name: "Top travel intents on Maio",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Beaches" },
        { "@type": "ListItem", position: 2, name: "Nature and protected areas" },
        { "@type": "ListItem", position: 3, name: "Culture and heritage" },
        { "@type": "ListItem", position: 4, name: "Local experiences" },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <HomeLandingPage />
    </>
  );
}
