import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "../../../packages/maio-ui/maio-ui.css";
import { RegisterServiceWorker } from "../components/register-sw";
import { t } from "../lib/i18n";
import { currentBandwidth, currentLocale, currentPath } from "../lib/request-locale";
import { localeHtmlLang } from "../lib/locale";
import { SITE_URL, siteSchemaFor } from "../lib/seo";
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
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await currentLocale();
  const bandwidth = await currentBandwidth();
  const path = await currentPath();
  const returnTo = encodeURIComponent(path === "/" ? `/${locale}` : `/${locale}${path}`);
  return (
    <html lang={localeHtmlLang(locale)} className={sans.variable} data-bandwidth={bandwidth}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchemaFor(locale)).replace(/</g, "\\u003c") }} />
        {bandwidth === "low" ? (
          <p className="lite-banner" role="status">
            {t("lite.autoBanner", undefined, locale)}{" "}
            <a href={`/api/bandwidth?mode=off&return=${returnTo}`}>{t("lite.disable", undefined, locale)}</a>
          </p>
        ) : null}
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
