import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();
const YEAR = 2026;
const MONTH = 4;

const APRIL_VALUES = [
  { sigla: "CMP", valor: 73000884 },
  { sigla: "CMSM", valor: 60966826 },
  { sigla: "CMSCZ", valor: 60914102 },
  { sigla: "CMSC", valor: 42003803 },
  { sigla: "CMSV", valor: 38421533 },
  { sigla: "CMSF", valor: 32288165 },
  { sigla: "CMRG", valor: 27603358 },
  { sigla: "CMPN", valor: 27018746 },
  { sigla: "CMSAL", valor: 20779439 },
  { sigla: "CMPAUL", valor: 20126616 },
  { sigla: "CMSD", valor: 19962641 },
  { sigla: "CMSSM", valor: 19549547 },
  { sigla: "CMBV", valor: 16634246 },
  { sigla: "CMMF", valor: 14877265 },
  { sigla: "CMRGST", valor: 13821697 },
  { sigla: "CMBR", valor: 13643741 },
  { sigla: "CMRB", valor: 12540233 },
  { sigla: "CMT", valor: 11564827 },
  { sigla: "CMSLO", valor: 10496991 },
  { sigla: "CMTSN", valor: 10382248 },
  { sigla: "CMMAIO", valor: 9219167 },
  { sigla: "CMSCFG", valor: 7031891 },
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
  const total = APRIL_VALUES.reduce((sum, row) => sum + row.valor, 0);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(MONGODB_DB);
  const col = db.collection("transparencia_raw");

  for (const row of APRIL_VALUES) {
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
            note: "2026 abril atualizado manualmente (MES=4).",
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
  console.log(`Transferências municipais atualizadas: ${APRIL_VALUES.length} entradas (MES=${MONTH})`);
  console.log(`Total abril (municípios): ${total}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

