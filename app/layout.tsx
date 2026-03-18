import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "./theme-provider";
import LayoutShell from "@/components/LayoutShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";


export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL("https://www.maioazul.com"),
    manifest: "/manifest.webmanifest",
    title: {
      default: "MaioAzul",
      template: "%s · MaioAzul",
    },
    description:
      "MaioAzul is a local-first guide to Maio, Cabo Verde, with maps, places, experiences, practical information, and island data for residents and visitors.",
    alternates: {
      canonical: "https://www.maioazul.com",
      languages: {
        en: "https://www.maioazul.com",
        pt: "https://www.maioazul.com",
      },
    },
    openGraph: {
      type: "website",
      url: "https://www.maioazul.com",
      title: "Maio, at its own pace",
      description:
        "Explore Maio through local places, practical tools, and on-the-ground context, built with care for residents and visitors.",
      images: [
        {
          url: "https://www.maioazul.com/og2.jpg",
          width: 1200,
          height: 630,
          alt: "MaioAzul — Maio, at its own pace",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "MaioAzul",
      description:
        "Local-first guide to Maio, Cabo Verde: maps, places, experiences, and practical island information.",
      images: ["https://www.maioazul.com/og2.jpg"],
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      title: "MaioAzul",
      statusBarStyle: "black-translucent",
    },
    robots: {
      index: true,
      follow: true,
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
  return (
    <html lang="en" className="dark bg-background">

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
      </head>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider>
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
        <Analytics />
        <ServiceWorkerRegister />
      </body>

    </html>
  );
}
