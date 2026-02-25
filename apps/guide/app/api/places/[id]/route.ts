import { NextResponse, type NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { promises as fs } from "fs";
import path from "path";

const DB_TIMEOUT_MS = Number(process.env.PLACES_DB_TIMEOUT_MS || 2500);
const DB_BACKOFF_MS = Number(process.env.PLACES_DB_BACKOFF_MS || 5 * 60 * 1000);
let dbUnavailableUntil = 0;

const LOCAL_PLACES_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "maio_places_with_coords.json"
);

async function readLocalPlaces() {
  const raw = await fs.readFile(LOCAL_PLACES_PATH, "utf-8");
  return JSON.parse(raw);
}

const shouldSkipDb = () =>
  process.env.PLACES_FORCE_LOCAL === "1" || Date.now() < dbUnavailableUntil;

const markDbUnavailable = () => {
  dbUnavailableUntil = Date.now() + DB_BACKOFF_MS;
};

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Places DB request timeout")), ms)
    ),
  ]);
}

function normalizeImageUrl(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeTitle(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    if (!process.env.MONGODB_URI || shouldSkipDb()) {
      const places = await readLocalPlaces();
      const place = places.find((p: any) => p.id === id);
      if (!place) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(place);
    }

    const client = await withTimeout(clientPromise, DB_TIMEOUT_MS);
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const place = await withTimeout(db.collection("places").findOne({ id }), DB_TIMEOUT_MS);

    if (!place) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(place);
  } catch (err) {
    markDbUnavailable();
    console.error("Failed to load place from DB, falling back to local file", err);
    const places = await readLocalPlaces();
    const place = places.find((p: any) => p.id === id);
    if (!place) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(place);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const imageUrl = normalizeImageUrl(body?.image_url);
  const title = normalizeTitle(body?.name);

  if (!imageUrl && !title) {
    return NextResponse.json(
      { error: "Provide at least one field: image_url or name" },
      { status: 400 }
    );
  }

  if (imageUrl) {
    const isHttpUrl = /^https?:\/\//i.test(imageUrl);
    const isAppAsset = imageUrl.startsWith("/");
    if (!isHttpUrl && !isAppAsset) {
      return NextResponse.json(
        { error: "image_url must be an absolute URL or /path asset" },
        { status: 400 }
      );
    }
  }

  try {
    if (!process.env.MONGODB_URI || shouldSkipDb()) {
      const places = await readLocalPlaces();
      const idx = places.findIndex((p: any) => p.id === id);
      if (idx < 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const current = places[idx];
      let nextName = current?.name;
      if (title) {
        nextName =
          typeof current?.name === "object" && current?.name
            ? { ...(current.name || {}), en: title, pt: title }
            : title;
      }

      const updated = {
        ...current,
        ...(imageUrl ? { image_url: imageUrl } : {}),
        ...(title ? { name: nextName } : {}),
      };
      places[idx] = updated;
      await fs.writeFile(
        LOCAL_PLACES_PATH,
        `${JSON.stringify(places, null, 2)}\n`,
        "utf-8"
      );
      return NextResponse.json(updated);
    }

    const client = await withTimeout(clientPromise, DB_TIMEOUT_MS);
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const placesCollection = db.collection("places");
    const current = await withTimeout(placesCollection.findOne({ id }), DB_TIMEOUT_MS);
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let nextName = current?.name;
    if (title) {
      nextName =
        typeof current?.name === "object" && current?.name
          ? { ...(current.name || {}), en: title, pt: title }
          : title;
    }

    const setPayload: Record<string, unknown> = {};
    if (imageUrl) setPayload.image_url = imageUrl;
    if (title) setPayload.name = nextName;

    const update = await withTimeout(
      placesCollection.updateOne({ id }, { $set: setPayload }),
      DB_TIMEOUT_MS
    );

    if (!update.matchedCount) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await withTimeout(placesCollection.findOne({ id }), DB_TIMEOUT_MS);
    return NextResponse.json(updated);
  } catch (err) {
    markDbUnavailable();
    console.error("Failed to update place image", err);
    if (process.env.MONGODB_URI) {
      try {
        const places = await readLocalPlaces();
        const idx = places.findIndex((p: any) => p.id === id);
        if (idx >= 0) {
          const current = places[idx];
          let nextName = current?.name;
          if (title) {
            nextName =
              typeof current?.name === "object" && current?.name
                ? { ...(current.name || {}), en: title, pt: title }
                : title;
          }
          const updated = {
            ...current,
            ...(imageUrl ? { image_url: imageUrl } : {}),
            ...(title ? { name: nextName } : {}),
          };
          places[idx] = updated;
          await fs.writeFile(
            LOCAL_PLACES_PATH,
            `${JSON.stringify(places, null, 2)}\n`,
            "utf-8"
          );
          return NextResponse.json(updated);
        }
      } catch {
        // continue to API error response below
      }
    }
    return NextResponse.json({ error: "Failed to update place image" }, { status: 500 });
  }
}
