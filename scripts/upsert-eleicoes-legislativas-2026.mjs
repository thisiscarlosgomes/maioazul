import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();
const VERSION_URL = "https://eleicoes.cv/data/version.json";
const REGIONS_URL = "https://eleicoes.cv/data/regions.json";
const FETCH_TIMEOUT_MS = 15000;

const COLLECTION_RAW = "eleicoes_legislativas_2026_raw";
const COLLECTION_SUMMARY = "eleicoes_legislativas_2026_summary";

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
        if (!process.env[key]) process.env[key] = value;
      });
  } catch {
    // ignore missing file
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${url}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseRegionCodes(regions) {
  return asArray(regions)
    .map((row) => String(row?.code ?? "").trim().toLowerCase())
    .filter((code) => code.length > 0);
}

function normalizeTimestamp(version) {
  const ts = Number(version?.timestamp ?? 0);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  return new Date(ts);
}

await loadEnvFile(path.join(root, ".env.local"));
await loadEnvFile(path.join(root, ".env"));

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "maioazul";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

async function run() {
  const version = await fetchJson(VERSION_URL);
  const versionTag = String(version?.version ?? "").trim();

  if (!versionTag) {
    throw new Error("eleicoes.cv version.json returned empty version.");
  }

  const regions = await fetchJson(REGIONS_URL);
  const regionCodes = parseRegionCodes(regions);

  const coreScopes = ["global", "nacional"];
  const allScopes = [...coreScopes, ...regionCodes];
  const fetchedAt = new Date();

  const payloadByScope = {};
  const failedScopes = [];

  for (const scope of allScopes) {
    const url = `https://eleicoes.cv/data/${versionTag}/${scope}.json`;
    try {
      payloadByScope[scope] = await fetchJson(url);
    } catch (error) {
      failedScopes.push({
        scope,
        url,
        error: error instanceof Error ? error.message : "Unknown fetch error",
      });
    }
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  try {
    const db = client.db(MONGODB_DB);
    const rawCollection = db.collection(COLLECTION_RAW);
    const summaryCollection = db.collection(COLLECTION_SUMMARY);

    await rawCollection.createIndex({ election: 1, version: 1 }, { unique: true });
    await rawCollection.createIndex({ fetchedAt: -1 });
    await summaryCollection.createIndex(
      { election: 1, version: 1, scope: 1 },
      { unique: true },
    );
    await summaryCollection.createIndex({ scope: 1, fetchedAt: -1 });

    const rawDoc = {
      election: "legislativas_2026",
      version: versionTag,
      versionMeta: version,
      source: "https://eleicoes.cv",
      sourceDateTime: version?.date && version?.time ? `${version.date} ${version.time}` : null,
      sourceTimestamp: normalizeTimestamp(version),
      regions,
      payloadByScope,
      scopesAvailable: Object.keys(payloadByScope).sort(),
      failedScopes,
      fetchedAt,
      updatedAt: fetchedAt,
    };

    await rawCollection.updateOne(
      { election: "legislativas_2026", version: versionTag },
      {
        $set: rawDoc,
        $setOnInsert: { createdAt: fetchedAt },
      },
      { upsert: true },
    );

    const summaryOps = Object.entries(payloadByScope).map(([scope, payload]) => ({
      updateOne: {
        filter: { election: "legislativas_2026", version: versionTag, scope },
        update: {
          $set: {
            election: "legislativas_2026",
            version: versionTag,
            scope,
            source: "https://eleicoes.cv",
            payload,
            fetchedAt,
            updatedAt: fetchedAt,
          },
          $setOnInsert: { createdAt: fetchedAt },
        },
        upsert: true,
      },
    }));

    if (summaryOps.length > 0) {
      await summaryCollection.bulkWrite(summaryOps, { ordered: false });
    }

    console.log("Legislativas 2026 snapshot upsert complete.");
    console.log(
      JSON.stringify(
        {
          db: MONGODB_DB,
          election: "legislativas_2026",
          version: versionTag,
          fetchedScopes: Object.keys(payloadByScope).length,
          failedScopesCount: failedScopes.length,
          failedScopes,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

