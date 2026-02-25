import "./globals.css";

import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "./theme-provider";
import LayoutShell from "@/components/LayoutShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";


export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL("https://www.visit-maio.com"),
    manifest: "/manifest.webmanifest",
    title: {
      default: "Visit Maio",
      template: "%s · Visit Maio",
    },
    description:
      "A slower way to discover Maio. Rooted in local life, shared with care, and built to last.",
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
        <ThemeProvider defaultTheme="dark">
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>

    </html>
  );
}
