import path from "path";
import { promises as fs } from "fs";
import { spawn } from "child_process";
import { MongoClient } from "mongodb";

const root = process.cwd();
const DEFAULT_INPUT_PATH = path.join(root, "data", "energy", "maio_energy_core_data.json");
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
const MONGODB_DB = process.env.MONGODB_DB || "maioazul";
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

function toNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePayload(payload) {
  const annualDemand = payload?.core_data?.annual_electricity_demand_gwh ?? {};
  const solarPlant = payload?.core_data?.solar_plant_reference ?? {};

  return {
    scope: "municipal",
    dataset: String(payload?.dataset ?? "maio_energy_core_data"),
    entity: {
      country: String(payload?.entity?.country ?? "Cabo Verde"),
      island: String(payload?.entity?.island ?? "Maio"),
      municipality: String(payload?.entity?.municipality ?? "Maio"),
    },
    as_of_date: String(payload?.as_of_date ?? new Date().toISOString().slice(0, 10)),
    units: {
      annual_demand: String(payload?.units?.annual_demand ?? "GWh_per_year"),
      solar_generation: String(payload?.units?.solar_generation ?? "MWh_per_year"),
      solar_capacity: String(payload?.units?.solar_capacity ?? "kWp"),
      share_of_demand: String(payload?.units?.share_of_demand ?? "percent"),
    },
    summary: {
      annualDemandGwh: {
        planningForecast2025: toNumber(annualDemand?.planning_forecast_2025),
        impliedCurrentFromSolarPlantReport: toNumber(
          annualDemand?.implied_current_from_solar_plant_report
        ),
        recommendedWorkingValueGwh: toNumber(annualDemand?.recommended_working_value_gwh),
        lowerBoundGwh: toNumber(annualDemand?.lower_bound_gwh),
        upperBoundGwh: toNumber(annualDemand?.upper_bound_gwh),
        reason: String(annualDemand?.recommended_working_value_reason ?? ""),
      },
      solarPlantReference: {
        installedCapacityKwp: toNumber(solarPlant?.installed_capacity_kwp),
        expectedAnnualGenerationMwh: toNumber(solarPlant?.expected_annual_generation_mwh),
        reportedShareOfDemandPercent: toNumber(
          solarPlant?.reported_share_of_maio_current_demand_percent
        ),
      },
    },
    source_quality: payload?.source_quality ?? {},
    sources: Array.isArray(payload?.sources) ? payload.sources : [],
    core_data: payload?.core_data ?? {},
  };
}

async function maybeGenerateMetricBlogs() {
  if (process.env.AUTO_GENERATE_METRIC_BLOGS !== "1") return;

  await new Promise((resolve, reject) => {
    const child = spawn(
      "node",
      [path.join(root, "scripts", "generate-metric-blog-posts.mjs"), "--max-posts=3"],
      {
        stdio: "inherit",
        env: process.env,
      }
    );

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Metric blog generation failed with code ${code}`));
    });
  });
}

async function run() {
  const raw = await fs.readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  const normalized = normalizePayload(parsed);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);
  const col = db.collection("maio_energy_core");

  await col.createIndex(
    { dataset: 1, "entity.island": 1, as_of_date: 1 },
    { unique: true },
  );

  const res = await col.updateOne(
    {
      dataset: normalized.dataset,
      "entity.island": normalized.entity.island,
      as_of_date: normalized.as_of_date,
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
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  await client.close();

  console.log("Maio energy core upsert complete");
  console.log(
    JSON.stringify(
      {
        inputPath,
        inserted: res.upsertedCount === 1,
        modified: res.modifiedCount === 1,
        as_of_date: normalized.as_of_date,
        island: normalized.entity.island,
      },
      null,
      2
    )
  );

  await maybeGenerateMetricBlogs();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
