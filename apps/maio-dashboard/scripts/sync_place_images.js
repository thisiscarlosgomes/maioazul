#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const DATA_PATH = path.join(ROOT, "public", "data", "maio_places_with_coords.json");

function loadEnvIfNeeded() {
  if (process.env.MONGODB_URI) return;
  if (!fs.existsSync(ENV_PATH)) return;
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  raw.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

function readPlaces() {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error("Expected an array in maio_places_with_coords.json");
  }
  return data;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const includeAll = process.argv.includes("--all");
  loadEnvIfNeeded();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing. Set it in .env.local or environment.");
  }

  const places = readPlaces();
  const updates = places
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      location: p.location,
      category: p.category,
      tags: p.tags,
      coordinates: p.coordinates,
      image_url: p.image_url,
      source: p.source,
      osm_id: p.osm_id,
      geo_source: p.geo_source,
    }))
    .filter((p) => p.id);

  console.log(`Found ${updates.length} places in JSON`);
  if (!updates.length) return;

  if (dryRun) {
    console.log("Dry run mode. Sample updates:");
    console.log(updates.slice(0, 5));
    return;
  }

  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB || "maioazul";
  const db = client.db(dbName);
  const collection = db.collection("places");

  let updated = 0;
  for (const u of updates) {
    const payload = includeAll
      ? u
      : {
          id: u.id,
          image_url: u.image_url,
        };
    const res = await collection.updateOne(
      { id: u.id },
      { $set: payload },
      { upsert: includeAll }
    );
    if (res.modifiedCount > 0) updated += 1;
  }

  await client.close();
  console.log(`Updated ${updated} records.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
