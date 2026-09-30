import { NextResponse, type NextRequest } from "next/server";
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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    if (!process.env.MONGODB_URI) {
      const places = await readLocalPlaces();
      const place = places.find((p: any) => p.id === id);
      if (!place) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(place);
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "maioazul");
    const place = await db.collection("places").findOne({ id });

    if (!place) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(place);
  } catch (err) {
    console.error("Failed to load place from DB, falling back to local file", err);
    const places = await readLocalPlaces();
    const place = places.find((p: any) => p.id === id);
    if (!place) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(place);
  }
}
