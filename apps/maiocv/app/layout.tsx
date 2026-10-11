import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_URL, description, pageMetadata, siteSchema } from "../lib/seo";
const sans = localFont({
  src: "../public/fonts/PPNeueMontreal-Regular.woff2",
  variable: "--font-sans",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...pageMetadata("MaioCV — IA e iniciativas digitais no Maio, Cabo Verde", description, "/"),
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className={sans.variable}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema).replace(/</g, "\\u003c") }} />
        {children}
      </body>
    </html>
  );
}
