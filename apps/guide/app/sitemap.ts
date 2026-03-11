import type { MetadataRoute } from "next";
import fs from "node:fs";
import path from "node:path";

const SITE_URL = "https://www.visit-maio.com";

type PlaceRecord = { id?: string };
type ExperienceRecord = { slug?: string };

function readJsonFile<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/places`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/map`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/experiences`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/sports`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/services/esim`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/manifest`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const placesPath = path.join(process.cwd(), "public", "data", "maio_places_with_coords.json");
  const experiencesPath = path.join(process.cwd(), "public", "data", "experience_places_by_slug.json");

  const places = readJsonFile<PlaceRecord[]>(placesPath) ?? [];
  const experienceGroups = readJsonFile<ExperienceRecord[]>(experiencesPath) ?? [];

  const placeRoutes: MetadataRoute.Sitemap = places
    .map((item) => item?.id)
    .filter((id): id is string => Boolean(id))
    .map((id) => ({
      url: `${SITE_URL}/places/${id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const experienceRoutes: MetadataRoute.Sitemap = experienceGroups
    .map((group) => group?.slug)
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => ({
      url: `${SITE_URL}/experiences/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...staticRoutes, ...placeRoutes, ...experienceRoutes];
}
