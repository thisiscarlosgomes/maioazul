import "./globals.css";

import type { Metadata, Viewport } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL("https://www.maioazul.com"),
    title: {
      default: "MaioAzul",
      template: "%s · MaioAzul",
    },
    description:
      "MaioAzul is a quiet, local-first guide to the island of Maio, Cabo Verde. A slower way to understand nature, people, and everyday life — built to last.",
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
      title: "MaioAzul · Maio, at its own pace",
      description:
        "A slower way to discover Maio. Rooted in local life, shared with care, and built to last.",
      images: [
        {
          url: "https://www.maioazul.com/og.jpg",
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
        "A quiet, local-first guide to the island of Maio, Cabo Verde.",
      images: ["https://www.maioazul.com/og.jpg"],
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preload local font */}
        <link
          rel="preload"
          href="/fonts/mabry-regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
