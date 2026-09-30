import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();

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
}

await loadEnvFile(path.join(root, ".env.local"));
await loadEnvFile(path.join(root, ".env"));

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

const budgetModule = await import("../lib/budget.ts");
const { AVAILABLE_BUDGET_YEARS, getBudgetDataset } = budgetModule;

async function run() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = process.env.MONGODB_DB ? client.db(process.env.MONGODB_DB) : client.db();
  const col = db.collection("maio_budget");

  await col.createIndex(
    { dataset: 1, municipality: 1, year: 1 },
    { unique: true },
  );

  let inserted = 0;
  let updated = 0;

  for (const year of AVAILABLE_BUDGET_YEARS) {
    const payload = await getBudgetDataset(String(year));
    const res = await col.updateOne(
      {
        dataset: payload.dataset,
        municipality: payload.municipality,
        year: payload.year,
      },
      {
        $set: {
          dataset: payload.dataset,
          scope: payload.scope,
          municipality: payload.municipality,
          year: payload.year,
          payload,
          source: {
            kind: "validated_local_json",
            sourceFileName: payload.sourceDocument.sourceFileName,
            sourceFilePath: payload.sourceDocument.sourceFilePath,
            title: payload.sourceDocument.title,
          },
          validation: {
            totalRevenueCve: payload.summary.totalRevenueCve,
            totalExpenseCve: payload.summary.totalExpenseCve,
            investmentProjectsTotalCve: payload.investmentProjects.reduce(
              (sum, item) => sum + item.amountCve,
              0,
            ),
            investmentSharePct: payload.summary.investmentSharePct,
            manualReviewCount: payload.summary.manualReviewCount,
          },
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    if (res.upsertedCount === 1) inserted += 1;
    else if (res.modifiedCount === 1) updated += 1;
  }

  const stored = await col
    .find(
      { dataset: "budget", municipality: "Maio" },
      {
        projection: {
          _id: 0,
          year: 1,
          "validation.totalRevenueCve": 1,
          "validation.totalExpenseCve": 1,
          "validation.investmentProjectsTotalCve": 1,
        },
      },
    )
    .sort({ year: 1 })
    .toArray();

  await client.close();

  console.log("Budget seed complete");
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(JSON.stringify(stored, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
