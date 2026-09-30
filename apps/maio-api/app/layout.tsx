import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Maio Open Data — One island. A shared foundation.",
  description:
    "Explore and build with the geographic assets, places and public datasets of Maio, Cabo Verde.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
