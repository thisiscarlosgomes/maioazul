import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const sans = localFont({ src: "../public/fonts/PPNeueMontreal-Regular.woff2", variable: "--font-sans", display: "swap" });
export const metadata: Metadata = {
  title: "MaioCV — Uma ilha. Novas possibilidades.",
  description: "Conheça as iniciativas digitais da ilha do Maio: dados abertos, Portal de Dados e VisitMaio. Informação que aproxima a ilha do mundo.",
  openGraph: { title: "MaioCV — Iniciativas digitais do Maio", description: "Uma ilha. Novas possibilidades. Explore os dados, conheça o território e descubra o Maio.", locale: "pt_PT", type: "website" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt" className={sans.variable}><body>{children}</body></html>;
}
