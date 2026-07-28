import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Place Images Admin",
  description: "Internal page for maintaining place and map image references.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlaceImagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
