import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();
const EXTERNAL_SECTOR_PATH = path.join(root, "public", "data", "external-sector-bcv-2025.json");
const PAYMENT_SYSTEM_PATH = path.join(root, "public", "data", "payment-system-2019-2023.json");

const DATASETS = [
  { key: "external_sector_bcv_2025", filePath: EXTERNAL_SECTOR_PATH },
  { key: "payment_system_2019_2023", filePath: PAYMENT_SYSTEM_PATH },
];

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
const COLLECTION = "finance_datasets";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);
  const col = db.collection(COLLECTION);

  await col.createIndex({ datasetKey: 1 }, { unique: true });

  const results = [];

  for (const dataset of DATASETS) {
    const raw = await fs.readFile(dataset.filePath, "utf8");
    const payload = JSON.parse(raw);

    const res = await col.updateOne(
      { datasetKey: dataset.key },
      {
        $set: {
          datasetKey: dataset.key,
          payload,
          source: {
            kind: "local_json",
            file_path: dataset.filePath,
            imported_at: new Date(),
          },
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    results.push({
      datasetKey: dataset.key,
      inserted: res.upsertedCount === 1,
      modified: res.modifiedCount === 1,
      filePath: dataset.filePath,
    });
  }

  await client.close();
  console.log("Finance datasets upsert complete");
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

