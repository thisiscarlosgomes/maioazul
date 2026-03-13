import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();
const DEFAULT_INPUT_PATH = path.join(
  root,
  "data",
  "transport",
  "cabo_verde_transportes_2025.json"
);
const inputPathArg = process.argv[2];
const inputPath = inputPathArg ? path.resolve(inputPathArg) : DEFAULT_INPUT_PATH;

async function loadEnvFile(filePath) {
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
          (value.startsWith('"') && value.endsWith('"')) ||
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
}

await loadEnvFile(path.join(root, ".env.local"));
await loadEnvFile(path.join(root, ".env"));

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "maioazul";
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRow(row, map) {
  const normalized = {};
  for (const [key, transform] of Object.entries(map)) {
    normalized[key] = transform(row?.[key]);
  }
  return normalized;
}

function normalizePayload(payload) {
  const shipsByPort = Array.isArray(payload?.maritime?.ships_by_port_2025)
    ? payload.maritime.ships_by_port_2025.map((row) =>
        normalizeRow(row, {
          port: (v) => String(v ?? ""),
          island: (v) => String(v ?? ""),
          movements: (v) => toNumber(v, 0),
        })
      )
    : [];

  const passengersByPort = Array.isArray(payload?.maritime?.passengers_by_port_2025)
    ? payload.maritime.passengers_by_port_2025.map((row) =>
        normalizeRow(row, {
          port: (v) => String(v ?? ""),
          island: (v) => String(v ?? ""),
          passengers: (v) => toNumber(v, 0),
        })
      )
    : [];

  const airportRows = Array.isArray(payload?.air?.passengers_by_airport_2025)
    ? payload.air.passengers_by_airport_2025.map((row) => ({
        airport: String(row?.airport ?? ""),
        island: String(row?.island ?? ""),
        embarked: toNumber(row?.embarked, 0),
        disembarked: toNumber(row?.disembarked, 0),
        transit:
          row?.transit == null || row?.transit === "-"
            ? null
            : toNumber(row?.transit, 0),
        total: toNumber(row?.total, 0),
      }))
    : [];

  const aircraftRows = Array.isArray(payload?.air?.aircraft_by_airport_2025)
    ? payload.air.aircraft_by_airport_2025.map((row) => ({
        airport: String(row?.airport ?? ""),
        island: String(row?.island ?? ""),
        domestic: toNumber(row?.domestic, 0),
        international:
          row?.international == null || row?.international === "-"
            ? null
            : toNumber(row?.international, 0),
        total: toNumber(row?.total, 0),
      }))
    : [];

  const comparison = Array.isArray(payload?.comparison_2024_2025)
    ? payload.comparison_2024_2025.map((row) => ({
        mode: String(row?.mode ?? ""),
        metric: String(row?.metric ?? ""),
        value_2024: toNumber(row?.value_2024, 0),
        value_2025: toNumber(row?.value_2025, 0),
        variation_pct: Number.isFinite(Number(row?.variation_pct))
          ? Number(row?.variation_pct)
          : null,
      }))
    : [];

  return {
    dataset: String(payload?.dataset ?? "cabo_verde_transportes_2025"),
    scope: String(payload?.scope ?? "national"),
    country: String(payload?.country ?? "Cabo Verde"),
    as_of_year: toNumber(payload?.as_of_year, 2025),
    as_of_date: String(payload?.as_of_date ?? "2025-12-31"),
    sources: Array.isArray(payload?.sources) ? payload.sources : [],
    maritime: {
      ships_by_port_2025: shipsByPort,
      passengers_by_port_2025: passengersByPort,
    },
    air: {
      aircraft_by_airport_2025: aircraftRows,
      aircraft_totals_2025: {
        domestic: toNumber(payload?.air?.aircraft_totals_2025?.domestic, 0),
        international: toNumber(payload?.air?.aircraft_totals_2025?.international, 0),
        total: toNumber(payload?.air?.aircraft_totals_2025?.total, 0),
      },
      passengers_by_airport_2025: airportRows,
      totals_2025: {
        embarked: toNumber(payload?.air?.totals_2025?.embarked, 0),
        disembarked: toNumber(payload?.air?.totals_2025?.disembarked, 0),
        transit: toNumber(payload?.air?.totals_2025?.transit, 0),
        total: toNumber(payload?.air?.totals_2025?.total, 0),
      },
    },
    comparison_2024_2025: comparison,
  };
}

async function run() {
  const raw = await fs.readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  const normalized = normalizePayload(parsed);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(MONGODB_DB);
  const col = db.collection("transportes_cv");

  await col.createIndex({ dataset: 1, as_of_year: 1 }, { unique: true });

  const result = await col.updateOne(
    {
      dataset: normalized.dataset,
      as_of_year: normalized.as_of_year,
    },
    {
      $set: {
        ...normalized,
        source: {
          kind: "local_json",
          file_path: inputPath,
          imported_at: new Date(),
        },
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  await client.close();

  console.log("Transportes 2025 upsert complete");
  console.log(
    JSON.stringify(
      {
        dataset: normalized.dataset,
        year: normalized.as_of_year,
        inserted: result.upsertedCount === 1,
        modified: result.modifiedCount === 1,
        shipsRows: normalized.maritime.ships_by_port_2025.length,
        maritimePassengerRows: normalized.maritime.passengers_by_port_2025.length,
        airportsRows: normalized.air.passengers_by_airport_2025.length,
        aircraftRows: normalized.air.aircraft_by_airport_2025.length,
        comparisonRows: normalized.comparison_2024_2025.length,
      },
      null,
      2
    )
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
