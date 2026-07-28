#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "experience_places_by_slug.json"
);

function getArg(name, fallback = "") {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

function decodeEscaped(text) {
  return text
    .replace(/\\u002F/g, "/")
    .replace(/\\u003D/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\\\//g, "/");
}

function extractMeta(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function normalizeForDedupe(url) {
  return url.split("?")[0];
}

function extractRoomId(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/rooms\/(\d+)/);
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}

function extractAllImageUrls(html, roomId, limit = 40) {
  const decoded = decodeEscaped(html);
  const matches = decoded.match(/https?:\/\/[^"'\s<>]*muscache\.com[^"'\s<>]*/gi) || [];
  const cleaned = matches
    .map((url) => url.replace(/\\+$/g, ""))
    .filter((url) => /\.(jpe?g|png|webp|avif)(\?|$)/i.test(url))
    .filter((url) => {
      const marker = roomId ? `Hosting-${roomId}` : "Hosting-";
      return url.includes(marker);
    });

  const unique = [];
  const seen = new Set();
  for (const url of cleaned) {
    const key = normalizeForDedupe(url);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(url);
    if (unique.length >= limit) break;
  }
  return unique;
}

async function fetchImages(url) {
  const photoTourUrl = (() => {
    try {
      const u = new URL(url);
      u.searchParams.set("modal", "PHOTO_TOUR_SCROLLABLE");
      return u.toString();
    } catch {
      return url;
    }
  })();

  const fetchOne = async (targetUrl, roomId) => {
    const res = await fetch(targetUrl, {
      headers: {
        "user-agent": "Mozilla/5.0",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return { image: "", images: [] };
    const html = await res.text();
    const images = extractAllImageUrls(html, roomId);
    const image = extractMeta(html, "og:image") || images[0] || "";
    return { image, images };
  };

  try {
    const roomId = extractRoomId(url);
    const first = await fetchOne(url, roomId);
    const second =
      photoTourUrl === url ? { image: "", images: [] } : await fetchOne(photoTourUrl, roomId);
    const images = [...first.images, ...second.images]
      .filter(Boolean)
      .filter((v, i, a) => a.findIndex((x) => normalizeForDedupe(x) === normalizeForDedupe(v)) === i);
    const image = first.image || second.image || images[0] || "";
    return { image, images };
  } catch {
    return { image: "", images: [] };
  }
}

async function main() {
  const slug = getArg("slug", "stay");
  const raw = await readFile(DATA_PATH, "utf-8");
  const groups = JSON.parse(raw);
  const group = groups.find((g) => g?.slug === slug);
  if (!group || !Array.isArray(group.places)) {
    console.log(`No places found for slug '${slug}'.`);
    return;
  }

  let updated = 0;
  for (const place of group.places) {
    const sourceUrl = typeof place.source_url === "string" ? place.source_url : "";
    if (!sourceUrl.includes("airbnb.com/rooms/")) continue;
    const { image, images } = await fetchImages(sourceUrl);
    const rawMerged = [image, ...(Array.isArray(place.images) ? place.images : []), ...images]
      .filter(Boolean);
    const seen = new Set();
    const merged = [];
    for (const url of rawMerged) {
      const key = normalizeForDedupe(url);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(url);
    }

    if (merged.length > 0) {
      place.image = merged[0];
      place.images = merged;
      updated += 1;
      console.log(`Updated ${place.id}: ${merged.length} images`);
    } else {
      console.log(`No images extracted for ${place.id}`);
    }
  }

  await writeFile(DATA_PATH, `${JSON.stringify(groups, null, 2)}\n`, "utf-8");
  console.log(`Done. Updated ${updated} Airbnb listing(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
