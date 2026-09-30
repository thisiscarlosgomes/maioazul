import fs from "node:fs/promises";
import path from "node:path";
import { MongoClient } from "mongodb";

const DATA_PATH = path.join(process.cwd(), "data/tourism/ine_tourism_2025.json");
const YEAR = 2025;
const NATIONAL_ISLAND_LABEL = "Todas as ilhas";
const ISLANDS = [
  "Santo Antão",
  "São Vicente",
  "São Nicolau",
  "Sal",
  "Boa Vista",
  "Maio",
  "Santiago",
  "Fogo",
  "Brava",
];

function requireMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }
  return uri;
}

async function loadData() {
  const raw = await fs.readFile(DATA_PATH, "utf8");
  return JSON.parse(raw);
}

function buildQuarterlyDocs(payload) {
  const now = new Date();
  return payload.quarterly_national_2025.map((row) => ({
    year: YEAR,
    quarter: Number(row.quarter),
    ilha: NATIONAL_ISLAND_LABEL,
    tipo_estabelecimento: "Todos",
    nacionalidade: "Todos",
    hospedes: Number(row.hospedes ?? 0),
    dormidas: Number(row.dormidas ?? 0),
    source: "INE Tabela 4 (2025)",
    granularity: "quarterly_national",
    updatedAt: now,
    createdAt: now,
  }));
}

function buildAnnualCountryIslandDocs(payload) {
  const now = new Date();
  const docs = [];

  for (const row of payload.country_island_annual_2025) {
    const pais = String(row.pais ?? "").trim();
    if (!pais) continue;

    for (const ilha of ISLANDS) {
      docs.push({
        year: YEAR,
        quarter: null,
        ilha,
        pais,
        hospedes: Number(row.hospedes?.[ilha] ?? 0),
        dormidas: Number(row.dormidas?.[ilha] ?? 0),
        source: "INE Tabela 7/9 (2025)",
        granularity: "annual",
        updatedAt: now,
        createdAt: now,
      });
    }
  }

  return docs;
}

async function upsertQuarterlyNational(rawCollection, docs) {
  let upserts = 0;
  for (const doc of docs) {
    const filter = {
      year: doc.year,
      quarter: doc.quarter,
      ilha: doc.ilha,
      tipo_estabelecimento: doc.tipo_estabelecimento,
      nacionalidade: doc.nacionalidade,
      granularity: doc.granularity,
    };

    await rawCollection.updateOne(
      filter,
      {
        $set: {
          hospedes: doc.hospedes,
          dormidas: doc.dormidas,
          source: doc.source,
          updatedAt: doc.updatedAt,
        },
        $setOnInsert: {
          createdAt: doc.createdAt,
        },
      },
      { upsert: true }
    );
    upserts += 1;
  }
  return upserts;
}

async function upsertAnnualCountryIsland(annualCollection, docs) {
  let upserts = 0;
  for (const doc of docs) {
    const filter = {
      year: doc.year,
      ilha: doc.ilha,
      pais: doc.pais,
      granularity: "annual",
    };

    await annualCollection.updateOne(
      filter,
      {
        $set: {
          quarter: null,
          hospedes: doc.hospedes,
          dormidas: doc.dormidas,
          source: doc.source,
          updatedAt: doc.updatedAt,
        },
        $setOnInsert: {
          createdAt: doc.createdAt,
        },
      },
      { upsert: true }
    );
    upserts += 1;
  }
  return upserts;
}

async function main() {
  const payload = await loadData();
  const uri = requireMongoUri();

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db();
    const rawCollection = db.collection("turismo_raw");
    const annualCollection = db.collection("turismo_country_island_annual");

    const quarterlyDocs = buildQuarterlyDocs(payload);
    const annualDocs = buildAnnualCountryIslandDocs(payload);

    const quarterlyCount = await upsertQuarterlyNational(rawCollection, quarterlyDocs);
    const annualCount = await upsertAnnualCountryIsland(annualCollection, annualDocs);

    console.log(`Upserted quarterly national docs: ${quarterlyCount}`);
    console.log(`Upserted annual country-island docs: ${annualCount}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Failed to upsert INE tourism 2025 data:", error);
  process.exitCode = 1;
});
