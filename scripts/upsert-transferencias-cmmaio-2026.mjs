import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();

const MUNICIPIO = "CMMAIO";
const YEAR = 2026;
const KEY = `transf:${YEAR}:${MUNICIPIO}`;
const JAN_2026_VALUE = 9219167;

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
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);
  const col = db.collection("transparencia_raw");

  const existing = await col.findOne({ key: KEY });
  const baseData = Array.isArray(existing?.data) ? existing.data : [];

  const filtered = baseData.filter((row) => Number(row?.MES) !== 1);
  const updatedData = [
    ...filtered,
    {
      MES: 1,
      VALOR_PAGO: JAN_2026_VALUE,
      SIGLA: MUNICIPIO,
    },
  ].sort((a, b) => Number(a.MES) - Number(b.MES));

  await col.updateOne(
    { key: KEY },
    {
      $set: {
        key: KEY,
        data: updatedData,
        meta: {
          year: YEAR,
          municipio: MUNICIPIO,
          view: "month",
          source: "Portal Transparência CV",
          note: "Janeiro 2026 atualizado manualmente.",
        },
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  await client.close();
  console.log(`Transferências atualizadas: ${KEY} (MES=1, VALOR_PAGO=${JAN_2026_VALUE})`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
