import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "../../../packages/maio-ui/maio-ui.css";
import { currentLocale } from "../lib/request-locale";
import { localeHtmlLang } from "../lib/locale";
import { SITE_URL, siteSchema } from "../lib/seo";
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
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await currentLocale();
  return (
    <html lang={localeHtmlLang(locale)} className={sans.variable}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema).replace(/</g, "\\u003c") }} />
        {children}
      </body>
    </html>
  );
}
