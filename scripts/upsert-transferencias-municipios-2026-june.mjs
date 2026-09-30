import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();
const YEAR = 2026;
const MONTH = 6;

const JUNE_VALUES = [
  { sigla: "CMSCZ", valor: 75726602 },
  { sigla: "CMP", valor: 69136484 },
  { sigla: "CMSM", valor: 61727476 },
  { sigla: "CMSC", valor: 42003803 },
  { sigla: "CMSV", valor: 38417433 },
  { sigla: "CMSF", valor: 31014962 },
  { sigla: "CMPN", valor: 29157167 },
  { sigla: "CMT", valor: 26564827 },
  { sigla: "CMSAL", valor: 20775819 },
  { sigla: "CMRG", valor: 20009670 },
  { sigla: "CMSD", valor: 19740419 },
  { sigla: "CMBV", valor: 19302784 },
  { sigla: "CMPAUL", valor: 18208535 },
  { sigla: "CMMF", valor: 17720320 },
  { sigla: "CMSSM", valor: 16366348 },
  { sigla: "CMRGST", valor: 13197948 },
  { sigla: "CMRB", valor: 12309959 },
  { sigla: "CMSCFG", valor: 11923234 },
  { sigla: "CMBR", valor: 10915745 },
  { sigla: "CMSLO", valor: 10272649 },
  { sigla: "CMTSN", valor: 10118648 },
  { sigla: "CMMAIO", valor: 9353834 },
];

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

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

async function run() {
  const total = JUNE_VALUES.reduce((sum, row) => sum + row.valor, 0);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(MONGODB_DB);
  const col = db.collection("transparencia_raw");

  for (const row of JUNE_VALUES) {
    const key = `transf:${YEAR}:${row.sigla}`;
    const existing = await col.findOne({ key });
    const baseData = Array.isArray(existing?.data) ? existing.data : [];

    const filtered = baseData.filter((entry) => Number(entry?.MES) !== MONTH);
    const updatedData = [
      ...filtered,
      { MES: MONTH, VALOR_PAGO: row.valor, SIGLA: row.sigla },
    ].sort((a, b) => Number(a.MES) - Number(b.MES));

    await col.updateOne(
      { key },
      {
        $set: {
          key,
          data: updatedData,
          meta: {
            year: YEAR,
            municipio: row.sigla,
            view: "month",
            source: "Portal Transparência CV",
            note: "2026 junho atualizado manualmente (MES=6).",
          },
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  await client.close();
  console.log(`Transferências municipais atualizadas: ${JUNE_VALUES.length} entradas (MES=${MONTH})`);
  console.log(`Total junho (municípios): ${total}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
