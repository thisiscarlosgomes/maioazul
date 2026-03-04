import "./globals.css";

import type { Metadata, Viewport } from "next";

const siteUrl = "https://mbv.maioazul.com";
const defaultTitle = "Maio Beach Volley Camp";
const defaultDescription =
  "Camp de beach volley na Ilha do Maio, Cabo Verde (7-11 de agosto de 2026), com coaching de Márcio Araújo, treinos profissionais, experiências locais e vagas limitadas.";
const defaultOgImage = `${siteUrl}/og-camp.jpg`;

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(siteUrl),
    applicationName: defaultTitle,
    title: {
      default: defaultTitle,
      template: "%s · Maio Beach Volley Camp",
    },
    description: defaultDescription,
    keywords: [
      "Maio Beach Volley Camp",
      "beach volley",
      "beach volleyball camp",
      "Ilha do Maio",
      "Cabo Verde",
      "Maioazul",
      "Márcio Araújo",
      "camp desportivo",
      "volleyball",
      "inscrição camp",
    ],
    category: "sports",
    alternates: {
      canonical: siteUrl,
      languages: {
        pt: siteUrl,
        en: siteUrl,
      },
    },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png" }],
    },
    openGraph: {
      type: "website",
      url: siteUrl,
      siteName: defaultTitle,
      locale: "pt_CV",
      title: defaultTitle,
      description: defaultDescription,
      images: [
        {
          url: defaultOgImage,
          width: 1200,
          height: 630,
          alt: "Maio Beach Volley Camp na Ilha do Maio",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: defaultDescription,
      images: [defaultOgImage],
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
  width: "device-width",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
