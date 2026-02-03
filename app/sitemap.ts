import fs from "fs";
import path from "path";
import type { MetadataRoute } from "next";

const baseUrl = "https://www.maioazul.com";

const dataPath = path.join(
  process.cwd(),
  "public",
  "data",
  "maio_places_with_coords.json"
);

type Place = { id: string };

export default function sitemap(): MetadataRoute.Sitemap {
  let places: Place[] = [];
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    places = JSON.parse(raw) as Place[];
  } catch {
    places = [];
  }

  const staticRoutes = [
    "",
    "/map",
    "/places",
    "/favorites",
    "/directory",
    "/dashboard",
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.7,
    })),
    ...places.map((place) => ({
      url: `${baseUrl}/places/${place.id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
