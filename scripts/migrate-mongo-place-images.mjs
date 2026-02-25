import { promises as fs } from "fs";
import path from "path";
import { MongoClient } from "mongodb";

const root = process.cwd();

const loadEnvFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .forEach((line) => {
        const idx = line.indexOf("=");
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        if (
          (value.startsWith("\"") && value.endsWith("\"")) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });
  } catch {
    // ignore missing env files
  }
};

await loadEnvFile(path.join(root, ".env.local"));
await loadEnvFile(path.join(root, ".env"));

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "maioazul";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

const placesPath = path.join(root, "public", "data", "maio_places_with_coords.json");
const FORCE_UPDATE = process.argv.includes("--force");

const main = async () => {
  const raw = await fs.readFile(placesPath, "utf8");
  const places = JSON.parse(raw);

  const idToImage = new Map();
  for (const place of places) {
    if (place?.id && place?.image_url) {
      idToImage.set(place.id, place.image_url);
    }
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);
  const collection = db.collection("places");

  const cursor = collection.find({}, { projection: { _id: 1, id: 1, image_url: 1 } });

  let updated = 0;
  let skipped = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) break;
    const nextUrl = doc.id ? idToImage.get(doc.id) : null;
    if (!nextUrl) {
      skipped += 1;
      continue;
    }
    if (doc.image_url === nextUrl) {
      skipped += 1;
      continue;
    }
    if (!FORCE_UPDATE && typeof doc.image_url === "string" && !doc.image_url.startsWith("/places/")) {
      // already migrated or custom url
      skipped += 1;
      continue;
    }
    await collection.updateOne({ _id: doc._id }, { $set: { image_url: nextUrl } });
    updated += 1;
    console.log(`✓ ${doc.id}`);
  }

  await client.close();
  console.log(`Done. Updated ${updated} documents. Skipped ${skipped}.`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
