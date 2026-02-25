import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

/* =========================
   Config
========================= */

const COLLECTION = "places";
const DATA_FILE = path.join(
  process.cwd(),
  "public",
  "data",
  "maio_places_with_coords.json"
);

/* =========================
   Env loader (no deps)
========================= */

function loadEnv() {
  const candidates = [".env.local", ".env"];
  for (const name of candidates) {
    const filePath = path.join(process.cwd(), name);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

/* =========================
   Main
========================= */

async function run() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Missing "MONGODB_URI"');
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "maioazul");
  const col = db.collection(COLLECTION);

  /* =========================
     Indexes (safe to re-run)
  ========================= */

  await col.createIndex({ id: 1 }, { unique: true });
  await col.createIndex({ "name.pt": 1 });
  await col.createIndex({ "name.en": 1 });

  /* =========================
     Load data
  ========================= */

  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const places = JSON.parse(raw);

  let inserted = 0;
  let updated = 0;

  /* =========================
     Upsert records
  ========================= */

  for (const place of places) {
    const res = await col.updateOne(
      { id: place.id },
      {
        $set: {
          ...place,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (res.upsertedCount === 1) inserted++;
    else if (res.modifiedCount === 1) updated++;
  }

  await client.close();

  console.log("✅ Places ingestion complete");
  console.log(`• Inserted: ${inserted}`);
  console.log(`• Updated:  ${updated}`);

  process.exit(0);
}

/* =========================
   Run
========================= */

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
