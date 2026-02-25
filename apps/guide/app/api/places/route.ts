import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { promises as fs } from "fs";
import path from "path";

const DB_TIMEOUT_MS = Number(process.env.PLACES_DB_TIMEOUT_MS || 2500);
const DB_BACKOFF_MS = Number(process.env.PLACES_DB_BACKOFF_MS || 5 * 60 * 1000);
let dbUnavailableUntil = 0;

async function readLocalPlaces() {
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "maio_places_with_coords.json"
  );
  const raw = await fs.readFile(filePath, "utf-8");
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

export async function GET() {
  try {
    if (!process.env.MONGODB_URI || shouldSkipDb()) {
      const places = await readLocalPlaces();
      return NextResponse.json(places);
    }

    const client = await withTimeout(clientPromise, DB_TIMEOUT_MS);
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const places = await withTimeout(
      db.collection("places").find({}).toArray(),
      DB_TIMEOUT_MS
    );

    return NextResponse.json(places);
  } catch (err) {
    markDbUnavailable();
    console.error("Failed to load places from DB, falling back to local file", err);
    const places = await readLocalPlaces();
    return NextResponse.json(places);
  }
}
