import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { promises as fs } from "fs";
import path from "path";

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

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      const places = await readLocalPlaces();
      return NextResponse.json(places);
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const places = await db.collection("places").find({}).toArray();

    return NextResponse.json(places);
  } catch (err) {
    console.error("Failed to load places from DB, falling back to local file", err);
    const places = await readLocalPlaces();
    return NextResponse.json(places);
  }
}
