import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();
const YEAR = 2026;
const MONTH = 5;

const MAY_VALUES = [
  { sigla: "CMSV", valor: 90017433 },
  { sigla: "CMP", valor: 69129284 },
  { sigla: "CMSCZ", valor: 59539102 },
  { sigla: "CMSC", valor: 42351203 },
  { sigla: "CMSF", valor: 34241589 },
  { sigla: "CMSAL", valor: 28913180 },
  { sigla: "CMSM", valor: 27156737 },
  { sigla: "CMPN", valor: 26968546 },
  { sigla: "CMSD", valor: 19740419 },
  { sigla: "CMBV", valor: 16792580 },
  { sigla: "CMSSM", valor: 16727548 },
  { sigla: "CMPAUL", valor: 16028185 },
  { sigla: "CMRG", valor: 14864926 },
  { sigla: "CMRGST", valor: 12531281 },
  { sigla: "CMRB", valor: 12416626 },
  { sigla: "CMT", valor: 11675938 },
  { sigla: "CMMF", valor: 11650876 },
  { sigla: "CMSLO", valor: 10071267 },
  { sigla: "CMTSN", valor: 9911970 },
  { sigla: "CMMAIO", valor: 9219167 },
  { sigla: "CMBR", valor: 9099745 },
  { sigla: "CMSCFG", valor: 6815224 },
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
  const total = MAY_VALUES.reduce((sum, row) => sum + row.valor, 0);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(MONGODB_DB);
  const col = db.collection("transparencia_raw");

  for (const row of MAY_VALUES) {
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
            note: "2026 maio atualizado manualmente (MES=5).",
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
  console.log(`Transferências municipais atualizadas: ${MAY_VALUES.length} entradas (MES=${MONTH})`);
  console.log(`Total maio (municípios): ${total}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
