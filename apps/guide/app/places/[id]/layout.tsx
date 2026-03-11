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
  location?: { pt?: string; en?: string };
  category?: string;
  coordinates?: [number, number] | null;
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
  params,
  children,
}: {
  params: { id: string };
  children: React.ReactNode;
}) {
  const place = getPlace(params.id);
  const name = place?.name?.en || place?.name?.pt || "Place";
  const description =
    place?.description?.en ||
    place?.description?.pt ||
    "Discover a place on the island of Maio.";
  const location = place?.location?.en || place?.location?.pt || "Maio, Cabo Verde";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristAttraction",
        "@id": `https://www.visit-maio.com/places/${params.id}#place`,
        name,
        description,
        image: place?.image_url || "https://www.visit-maio.com/cover.jpg",
        address: {
          "@type": "PostalAddress",
          addressLocality: location,
          addressCountry: "CV",
        },
        geo:
          Array.isArray(place?.coordinates) && place.coordinates.length === 2
            ? {
                "@type": "GeoCoordinates",
                longitude: place.coordinates[0],
                latitude: place.coordinates[1],
              }
            : undefined,
        url: `https://www.visit-maio.com/places/${params.id}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.visit-maio.com/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Places",
            item: "https://www.visit-maio.com/places",
          },
          {
            "@type": "ListItem",
            position: 3,
            name,
            item: `https://www.visit-maio.com/places/${params.id}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
