import fs from "node:fs/promises";
import path from "node:path";
import { MongoClient } from "mongodb";

const DATA_PATH = path.join(process.cwd(), "data/tourism/ine_tourism_2026.json");
const YEAR = 2026;
const NATIONAL_ISLAND_LABEL = "Todas as ilhas";
const ISLANDS = ["Santo Antão", "São Vicente", "São Nicolau", "Sal", "Boa Vista", "Maio", "Santiago", "Fogo", "Brava"];

function requireMongoUri() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  return process.env.MONGODB_URI;
}

async function loadData() {
  return JSON.parse(await fs.readFile(DATA_PATH, "utf8"));
}

function rawFlowDocs(payload, now) {
  const docs = [1, 2].flatMap((quarter) => {
    const countryRows = payload[`country_island_q${quarter}_2026`];
    const domestic = countryRows.find((row) => row.pais === "Cabo Verde");
    const foreign = countryRows.find((row) => row.pais === "Estrangeiros");
    return ISLANDS.map((ilha, index) => ({
      year: YEAR,
      quarter,
      ilha,
      tipo_estabelecimento: "Todos",
      nacionalidade: "Todos",
      hospedes: Number(domestic.hospedes[index]) + Number(foreign.hospedes[index]),
      dormidas: Number(domestic.dormidas[index]) + Number(foreign.dormidas[index]),
      source: `INE Tabelas 3, 5 e 7 (${quarter}º trimestre de 2026)`,
      granularity: "quarterly_island",
      updatedAt: now,
      createdAt: now
    }));
  });

  return docs.concat(payload.quarterly_national_2026.map((row) => ({
    year: YEAR,
    quarter: Number(row.quarter),
    ilha: NATIONAL_ISLAND_LABEL,
    tipo_estabelecimento: "Todos",
    nacionalidade: "Todos",
    hospedes: Number(row.hospedes),
    dormidas: Number(row.dormidas),
    source: "INE Tabelas 3, 5 e 7 (1º trimestre de 2026)",
    granularity: "quarterly_national",
    updatedAt: now,
    createdAt: now
  })));
}

function countryIslandDocs(payload, now) {
  return [1, 2].flatMap((quarter) =>
    payload[`country_island_q${quarter}_2026`].flatMap((row) =>
      ISLANDS.map((ilha, index) => ({
        year: YEAR,
        quarter,
        ilha,
        pais: row.pais,
        metric: `quarter_${quarter}`,
        hospedes: Number(row.hospedes[index]),
        dormidas: Number(row.dormidas[index]),
        source: `INE Tabelas 5 e 7 (${quarter}º trimestre de 2026)`,
        granularity: "quarterly",
        updatedAt: now,
        createdAt: now
      }))
    )
  );
}

function occupancyDocs(payload, now) {
  return [1, 2].flatMap((quarter) =>
    payload[`occupancy_q${quarter}_2026`].flatMap((row) => Object.entries(row)
      .filter(([key, value]) => key !== "ilha" && value != null)
      .map(([tipo, value]) => ({
        year: YEAR,
        quarter,
        ilha: row.ilha,
        tipo_estabelecimento: tipo,
        metric: "occupancy_rate",
        value: Number(value),
        source: `INE Tabela 2 (${quarter}º trimestre de 2026)`,
        updatedAt: now,
        createdAt: now
      })))
  );
}

async function upsertMany(collection, docs, keyFields, mutableFields) {
  for (const doc of docs) {
    const filter = Object.fromEntries(keyFields.map((key) => [key, doc[key]]));
    const values = Object.fromEntries(mutableFields.map((key) => [key, doc[key]]));
    await collection.updateOne(filter, {
      $set: { ...values, source: doc.source, updatedAt: doc.updatedAt },
      $setOnInsert: { createdAt: doc.createdAt }
    }, { upsert: true });
  }
  return docs.length;
}

async function main() {
  const payload = await loadData();
  const now = new Date();
  const client = new MongoClient(requireMongoUri());
  await client.connect();
  try {
    const db = client.db();
    const countryCollection = db.collection("turismo_country_island_annual");
    await countryCollection.updateMany(
      {
        year: YEAR,
        quarter: 1,
        granularity: "quarterly",
        metric: { $exists: false }
      },
      { $set: { metric: "quarter_1", updatedAt: now } }
    );
    const flowCount = await upsertMany(db.collection("turismo_raw"), rawFlowDocs(payload, now),
      ["year", "quarter", "ilha", "tipo_estabelecimento", "nacionalidade", "granularity"],
      ["hospedes", "dormidas"]);
    const countryCount = await upsertMany(countryCollection, countryIslandDocs(payload, now),
      ["year", "quarter", "ilha", "pais", "granularity", "metric"], ["hospedes", "dormidas"]);
    const occupancyCount = await upsertMany(db.collection("turismo_structural"), occupancyDocs(payload, now),
      ["year", "quarter", "ilha", "tipo_estabelecimento", "metric"], ["value"]);
    console.log(JSON.stringify({ flowCount, countryCount, occupancyCount }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Failed to upsert INE tourism 2026 data:", error);
  process.exitCode = 1;
});
