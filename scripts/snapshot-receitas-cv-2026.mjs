import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();
const TARGET_YEAR = 2026;
const DATASET = "receitas_cv_recebedorias";
const SNAPSHOT_COLLECTION = "receitas_cv_recebedorias_snapshots";

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
const SNAPSHOT_LABEL = process.env.RECEITAS_2026_SNAPSHOT_LABEL || "2026-01";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);
  const active = db.collection(DATASET);
  const snapshots = db.collection(SNAPSHOT_COLLECTION);

  await snapshots.createIndex(
    { dataset: 1, year: 1, snapshotLabel: 1 },
    { unique: true },
  );

  const existing = await active.findOne({ dataset: DATASET, year: TARGET_YEAR });
  if (!existing) {
    throw new Error(`No active doc found for ${DATASET} year=${TARGET_YEAR}.`);
  }

  await snapshots.updateOne(
    { dataset: DATASET, year: TARGET_YEAR, snapshotLabel: SNAPSHOT_LABEL },
    {
      $set: {
        sourceUpdatedAt: new Date(),
        note: "Snapshot manual do estado atual de 2026.",
      },
      $setOnInsert: {
        dataset: DATASET,
        year: TARGET_YEAR,
        snapshotLabel: SNAPSHOT_LABEL,
        payload: {
          dataset: existing.dataset,
          year: existing.year,
          rows: existing.rows ?? [],
          total: existing.total ?? 0,
          updatedAt: existing.updatedAt ?? null,
          revisionLabel: existing.revisionLabel ?? null,
        },
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  await client.close();
  console.log(`Snapshot saved: ${DATASET} ${TARGET_YEAR} ${SNAPSHOT_LABEL}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

