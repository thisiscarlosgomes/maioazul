import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "./theme-provider";
import LayoutShell from "@/components/LayoutShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";


export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL("https://www.visit-maio.com"),
    manifest: "/manifest.webmanifest",
    applicationName: "Visit Maio",
    title: {
      default: "Visit Maio",
      template: "%s · Visit Maio",
    },
    description:
      "A slower way to discover Maio. Rooted in local life, shared with care, and built to last.",
    keywords: [
      "Maio",
      "Maio island",
      "Cabo Verde travel",
      "Cape Verde travel guide",
      "Visit Maio",
      "Maio beaches",
      "Maio tourism",
      "Maio map",
    ],
    category: "travel",
    alternates: {
      canonical: "https://www.visit-maio.com",
      languages: {
        en: "https://www.visit-maio.com",
        pt: "https://www.visit-maio.com",
      },
    },
    openGraph: {
      type: "website",
      url: "https://www.visit-maio.com",
      title: "Maio, at its own pace",
      description:
        "A slower way to discover Maio. Rooted in local life, shared with care, and built to last.",
      siteName: "Visit Maio",
      locale: "en_US",
      images: [
        {
          url: "https://www.visit-maio.com/cover.jpg",
          width: 1200,
          height: 630,
          alt: "Visit Maio — Maio, at its own pace",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Visit Maio",
      description:
        "A slower way to discover Maio. Rooted in local life, shared with care, and built to last.",
      images: ["https://www.visit-maio.com/cover.jpg"],
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      title: "Visit Maio",
      statusBarStyle: "black-translucent",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.visit-maio.com/#website",
        name: "Visit Maio",
        url: "https://www.visit-maio.com",
        inLanguage: ["en", "pt"],
        potentialAction: {
          "@type": "SearchAction",
          target: "https://www.visit-maio.com/places?query={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://www.visit-maio.com/#organization",
        name: "Visit Maio",
        url: "https://www.visit-maio.com",
        logo: "https://www.visit-maio.com/logo.png",
      },
      {
        "@type": "TravelGuide",
        "@id": "https://www.visit-maio.com/#travel-guide",
        name: "Visit Maio Travel Guide",
        url: "https://www.visit-maio.com",
        about: {
          "@type": "TouristDestination",
          "@id": "https://www.visit-maio.com/#destination-maio",
          name: "Maio, Cabo Verde",
          description:
            "A slow travel destination in Cabo Verde with protected nature, quiet villages, and long beaches.",
        },
      },
    ],
  };

  return (
    <html lang="pt" className="bg-background">

      <head>
        {/* Preload local font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=block"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron&family=DM+Sans&family=Rubik+Mono+One&family=Bebas+Neue&family=Space+Mono&family=Raleway&display=swap"
          rel="stylesheet"
        />

        <link
          rel="preload"
          href="/fonts/mabry-regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />

        <meta
          name="theme-color"
          content="#000000"
          media="(prefers-color-scheme: dark)"
        />
        <meta
          name="theme-color"
          content="#f8f7f2"
          media="(prefers-color-scheme: light)"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />


        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider defaultTheme="light">
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
        <ServiceWorkerRegister />
        <Analytics />
      </body>

    </html>
  );
}
