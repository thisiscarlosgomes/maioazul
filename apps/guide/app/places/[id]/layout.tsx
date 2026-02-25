import type { Metadata } from "next";
import fs from "fs";
import path from "path";

const dataPath = path.join(
  process.cwd(),
  "public",
  "data",
  "maio_places_with_coords.json"
);

type Place = {
  id: string;
  name?: { pt?: string; en?: string };
  description?: { pt?: string; en?: string };
  image_url?: string;
};

function getPlace(id: string): Place | null {
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    const data = JSON.parse(raw) as Place[];
    return data.find((p) => p.id === id) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const place = getPlace(id);
  const name = place?.name?.en || place?.name?.pt || "Place";
  const description =
    place?.description?.en ||
    place?.description?.pt ||
    "Discover a place on the island of Maio.";

  return {
    title: name,
    description,
    alternates: { canonical: `/places/${id}` },
    openGraph: {
      title: `${name} · Visit Maio`,
      description,
      url: `/places/${id}`,
      images: place?.image_url
        ? [{ url: place.image_url, alt: name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} · Visit Maio`,
      description,
      images: place?.image_url ? [place.image_url] : undefined,
    },
  };
}

export default function PlaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
