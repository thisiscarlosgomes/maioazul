import { NextResponse, type NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { promises as fs } from "fs";
import path from "path";

const FILE_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "experience_places_by_slug.json"
);
const DB_TIMEOUT_MS = Number(process.env.EXPERIENCES_DB_TIMEOUT_MS || 2500);
const DB_BACKOFF_MS = Number(process.env.EXPERIENCES_DB_BACKOFF_MS || 5 * 60 * 1000);
let dbUnavailableUntil = 0;

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

async function readLocalGroups() {
  const raw = await fs.readFile(FILE_PATH, "utf-8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  try {
    if (!process.env.MONGODB_URI || shouldSkipDb()) {
      const groups = await readLocalGroups();
      const group = groups.find((item: { slug?: string }) => item?.slug === slug);
      if (!group) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(group);
    }

    const client = await withTimeout(clientPromise, DB_TIMEOUT_MS);
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const group = await withTimeout(
      db.collection("experience_groups").findOne({ slug }, { projection: { _id: 0 } }),
      DB_TIMEOUT_MS
    );

    if (!group) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(group);
  } catch (err) {
    markDbUnavailable();
    console.error("Failed to load experience group from DB, falling back to file", err);
    const groups = await readLocalGroups();
    const group = groups.find((item: { slug?: string }) => item?.slug === slug);
    if (!group) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(group);
  }
}
