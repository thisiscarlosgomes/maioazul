import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";

type ExperienceGroup = {
  slug: string;
  title?: { en?: string; pt?: string };
  places?: Array<{ description?: string | { en?: string; pt?: string }; image?: string }>;
};

const dataPath = path.join(process.cwd(), "public", "data", "experience_places_by_slug.json");

function getGroups(): ExperienceGroup[] {
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    const parsed = JSON.parse(raw) as ExperienceGroup[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getGroup(slug: string): ExperienceGroup | undefined {
  return getGroups().find((group) => group.slug === slug);
}

export function generateStaticParams() {
  return getGroups()
    .map((group) => group.slug)
    .filter(Boolean)
    .map((slug) => ({ slug }));
}

function shorten(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const group = getGroup(slug);

  const title = group?.title?.en || group?.title?.pt || "Experience";
  const firstDescription = group?.places
    ?.map((place) => {
      const description = place.description;
      if (typeof description === "string") return description;
      return description?.en || description?.pt || "";
    })
    .find((value) => value.trim().length > 0);

  const description = firstDescription
    ? shorten(firstDescription)
    : "Explore local places and services for this Maio experience.";

  const image = group?.places?.find((place) => Boolean(place.image))?.image;

  return {
    title,
    description,
    alternates: { canonical: `/experiences/${slug}` },
    openGraph: {
      title: `${title} · Visit Maio`,
      description,
      url: `/experiences/${slug}`,
      images: image
        ? [
            {
              url: image,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Visit Maio`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default function ExperienceBySlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
