import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_URL, description, htmlLang, pageMetadata, siteSchema } from "../lib/seo";
const sans = localFont({
  src: [
    { path: "../../../packages/maio-tokens/fonts/PPNeueMontreal-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../../packages/maio-tokens/fonts/PPNeueMontreal-Medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-pp",
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
    <html lang={htmlLang} className={sans.variable}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema).replace(/</g, "\\u003c") }} />
        {children}
      </body>
    </html>
  );
}
