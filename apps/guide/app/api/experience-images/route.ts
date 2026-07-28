import { NextResponse, type NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { promises as fs } from "fs";
import path from "path";

type ExperienceImage = {
  id: string;
  title: string;
  subtitle?: { en?: string; pt?: string };
  image: string;
};

const FILE_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "experience_images.json"
);
const DB_TIMEOUT_MS = Number(process.env.EXPERIENCES_DB_TIMEOUT_MS || 2500);
const DB_BACKOFF_MS = Number(process.env.EXPERIENCES_DB_BACKOFF_MS || 5 * 60 * 1000);
let dbUnavailableUntil = 0;

const isValidImageUrl = (value: string) =>
  /^https?:\/\//i.test(value) || value.startsWith("/");
const shouldSkipDb = () =>
  process.env.EXPERIENCES_FORCE_LOCAL === "1" || Date.now() < dbUnavailableUntil;
const markDbUnavailable = () => {
  dbUnavailableUntil = Date.now() + DB_BACKOFF_MS;
};
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Experiences DB request timeout")), ms)
    ),
  ]);
}

async function readItems(): Promise<ExperienceImage[]> {
  const raw = await fs.readFile(FILE_PATH, "utf-8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

async function writeItems(items: ExperienceImage[]) {
  await fs.writeFile(FILE_PATH, `${JSON.stringify(items, null, 2)}\n`, "utf-8");
}

export async function GET() {
  try {
    if (!process.env.MONGODB_URI || shouldSkipDb()) {
      const items = await readItems();
      return NextResponse.json(items);
    }

    const client = await withTimeout(clientPromise, DB_TIMEOUT_MS);
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const items = await withTimeout(
      db.collection<ExperienceImage>("experience_images").find({}, { projection: { _id: 0 } }).toArray(),
      DB_TIMEOUT_MS
    );
    return NextResponse.json(items);
  } catch (err) {
    markDbUnavailable();
    console.error("Failed to read experience images from DB, falling back to file", err);
    try {
      const items = await readItems();
      return NextResponse.json(items);
    } catch {
      return NextResponse.json([], { status: 200 });
    }
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const image = typeof body?.image === "string" ? body.image.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  if (!image && !title) {
    return NextResponse.json(
      { error: "Provide at least one field: image or title" },
      { status: 400 }
    );
  }
  if (image && !isValidImageUrl(image)) {
    return NextResponse.json(
      { error: "image must be an absolute URL or /path asset" },
      { status: 400 }
    );
  }

  try {
    if (!process.env.MONGODB_URI || shouldSkipDb()) {
      const items = await readItems();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const updated = {
        ...items[index],
        ...(image ? { image } : {}),
        ...(title ? { title } : {}),
      };
      items[index] = updated;
      await writeItems(items);
      return NextResponse.json(updated);
    }

    const client = await withTimeout(clientPromise, DB_TIMEOUT_MS);
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const collection = db.collection<ExperienceImage>("experience_images");
    const current = await withTimeout(collection.findOne({ id }, { projection: { _id: 0 } }), DB_TIMEOUT_MS);

    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = {
      ...current,
      ...(image ? { image } : {}),
      ...(title ? { title } : {}),
    } as ExperienceImage;

    await withTimeout(
      collection.updateOne(
        { id },
        { $set: { ...(image ? { image } : {}), ...(title ? { title } : {}) } }
      ),
      DB_TIMEOUT_MS
    );

    try {
      const fileItems = await readItems();
      const idx = fileItems.findIndex((item) => item.id === id);
      if (idx >= 0) {
        fileItems[idx] = updated;
      } else {
        fileItems.push(updated);
      }
      await writeItems(fileItems);
    } catch {
      // ignore local sync failures
    }

    return NextResponse.json(updated);
  } catch (err) {
    markDbUnavailable();
    console.error("Failed to update experience image", err);
    return NextResponse.json(
      { error: "Failed to update experience image" },
      { status: 500 }
    );
  }
}
