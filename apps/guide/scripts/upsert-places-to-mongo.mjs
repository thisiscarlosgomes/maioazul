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

const placesPath = path.join(
  root,
  "public",
  "data",
  "maio_places_with_coords.json"
);

const main = async () => {
  const raw = await fs.readFile(placesPath, "utf8");
  const places = JSON.parse(raw);
  const deleteMissing = process.argv.includes("--delete-missing");

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);
  const collection = db.collection("places");

  const existing = await collection
    .find({}, { projection: { _id: 0, id: 1 } })
    .toArray();
  const existingIds = new Set(existing.map((doc) => doc.id).filter(Boolean));

  const toInsert = places.filter((place) => place?.id && !existingIds.has(place.id));
  const toUpdate = places.filter((place) => place?.id && existingIds.has(place.id));

  let inserted = 0;
  let updated = 0;

  if (toInsert.length) {
    await collection.insertMany(toInsert);
    inserted = toInsert.length;
  }

  for (const place of toUpdate) {
    const res = await collection.updateOne(
      { id: place.id },
      { $set: place }
    );
    if (res.modifiedCount > 0) updated += 1;
  }

  let deleted = 0;
  if (deleteMissing) {
    const jsonIds = new Set(places.map((place) => place?.id).filter(Boolean));
    const res = await collection.deleteMany({ id: { $nin: Array.from(jsonIds) } });
    deleted = res.deletedCount || 0;
  }

  await client.close();
  console.log(
    `Done. Inserted ${inserted} new places. Updated ${updated} existing places.${deleteMissing ? ` Deleted ${deleted} missing places.` : ""}`
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
