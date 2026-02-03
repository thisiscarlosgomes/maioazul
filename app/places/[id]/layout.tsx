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
  params: { id: string };
}): Promise<Metadata> {
  const place = getPlace(params.id);
  const name = place?.name?.en || place?.name?.pt || "Place";
  const description =
    place?.description?.en ||
    place?.description?.pt ||
    "Discover a place on the island of Maio.";

  return {
    title: name,
    description,
    alternates: { canonical: `/places/${params.id}` },
    openGraph: {
      title: `${name} · MaioAzul`,
      description,
      url: `/places/${params.id}`,
      images: place?.image_url
        ? [{ url: place.image_url, alt: name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} · MaioAzul`,
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
