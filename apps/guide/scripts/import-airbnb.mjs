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

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
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

function extractMeta(html, key) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1].trim());
  }
  return "";
}

function decodeEscaped(text) {
  return text
    .replace(/\\u002F/g, "/")
    .replace(/\\u003D/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\\\//g, "/")
    .replace(/\\u0025/g, "%");
}

function normalizeForDedupe(url) {
  return url.split("?")[0];
}

function extractAllImageUrls(html, roomId, limit = 40) {
  const decoded = decodeEscaped(html);
  const matches = decoded.match(/https?:\/\/[^"'\s<>]*muscache\.com[^"'\s<>]*/gi) || [];
  const hostingMarker = roomId ? `Hosting-${roomId}` : "Hosting-";
  const cleaned = matches
    .map((url) => url.replace(/\\+$/g, ""))
    .filter((url) => /\.(jpe?g|png|webp|avif)(\?|$)/i.test(url))
    .filter((url) => url.includes(hostingMarker));

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

async function fetchAirbnbMeta(url) {
  const photoTourUrl = (() => {
    try {
      const u = new URL(url);
      u.searchParams.set("modal", "PHOTO_TOUR_SCROLLABLE");
      return u.toString();
    } catch {
      return url;
    }
  })();

  const fetchOne = async (targetUrl) => {
    const res = await fetch(targetUrl, {
      headers: {
        "user-agent": "Mozilla/5.0",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return { title: "", image: "", images: [] };
    const html = await res.text();
    const images = extractAllImageUrls(html, extractRoomId(url));
    return {
      title: extractMeta(html, "og:title") || extractMeta(html, "twitter:title"),
      image: extractMeta(html, "og:image") || extractMeta(html, "twitter:image") || images[0] || "",
      images,
    };
  };

  try {
    const first = await fetchOne(url);
    const second = photoTourUrl === url ? { title: "", image: "", images: [] } : await fetchOne(photoTourUrl);
    const images = [...first.images, ...second.images]
      .filter(Boolean)
      .filter((v, i, a) => a.findIndex((x) => x.split("?")[0] === v.split("?")[0]) === i);

    return {
      title: first.title || second.title,
      image: first.image || second.image || images[0] || "",
      images,
    };
  } catch {
    return { title: "", image: "", images: [] };
  }
}

function slugLabel(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

async function main() {
  const url = getArg("url");
  if (!url) {
    console.error(
      "Missing --url. Example: node scripts/import-airbnb.mjs --url \"https://www.airbnb.com/rooms/123\" --slug stay"
    );
    process.exit(1);
  }

  const slug = getArg("slug", "stay");
  const manualTitle = getArg("title");
  const location = getArg("location", "");
  const phone = getArg("phone", "");
  const manualImage = getArg("image");
  const manualId = getArg("id");

  const roomId = extractRoomId(url);
  const meta = await fetchAirbnbMeta(url);
  const title =
    manualTitle || meta.title || (roomId ? `Airbnb room ${roomId}` : "Airbnb listing");
  const image = manualImage || meta.image || "";
  const images = [image, ...meta.images].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  const raw = await readFile(DATA_PATH, "utf-8");
  const groups = JSON.parse(raw);
  if (!Array.isArray(groups)) {
    throw new Error("experience_places_by_slug.json must be an array");
  }

  let group = groups.find((g) => g?.slug === slug);
  if (!group) {
    group = {
      slug,
      title: { en: slugLabel(slug), pt: slugLabel(slug) },
      places: [],
    };
    groups.push(group);
  }

  if (!Array.isArray(group.places)) group.places = [];

  const id = manualId || `${slug}-${roomId || Date.now().toString(36)}`;

  const item = {
    id,
    title,
    location,
    phone,
    image,
    images,
    source_url: url,
    airbnb_room_id: roomId,
  };

  group.places.push(item);
  await writeFile(DATA_PATH, `${JSON.stringify(groups, null, 2)}\n`, "utf-8");

  console.log("Imported Airbnb listing:");
  console.log(JSON.stringify(item, null, 2));
  console.log(`Updated: ${DATA_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
