import "./globals.css";

import type { Metadata, Viewport } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL("https://mbv.maioazul.com"),
    title: {
      default: "Maio Beach Volley Camp",
      template: "%s · Maio Beach Volley Camp",
    },
    description:
      "Camp de beach volley na Ilha do Maio, Cabo Verde.",
    alternates: {
      canonical: "https://mbv.maioazul.com",
      languages: {
        pt: "https://mbv.maioazul.com",
        en: "https://mbv.maioazul.com",
      },
    },
    openGraph: {
      type: "website",
      url: "https://mbv.maioazul.com",
      title: "Maio Beach Volley Camp",
      description:
        "Camp de beach volley na Ilha do Maio, Cabo Verde.",
      images: [
        {
          url: "https://mbv.maioazul.com/og-camp.jpg",
          width: 1200,
          height: 630,
          alt: "Maio Beach Volley Camp",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Maio Beach Volley Camp",
      description:
        "Camp de beach volley na Ilha do Maio, Cabo Verde.",
      images: ["https://mbv.maioazul.com/og-camp.jpg"],
    },
    robots: {
      index: true,
      follow: true,
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
