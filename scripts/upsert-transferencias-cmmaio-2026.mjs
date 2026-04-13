import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();

const MUNICIPIO = "CMMAIO";
const YEAR = 2026;
const KEY = `transf:${YEAR}:${MUNICIPIO}`;
const MONTHLY_VALUES_2026 = {
  1: 9219167,
  2: 9219167,
  3: 11396945,
};

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

  const monthKeys = Object.keys(MONTHLY_VALUES_2026).map((m) => Number(m));
  const filtered = baseData.filter((row) => !monthKeys.includes(Number(row?.MES)));
  const updates = monthKeys.map((month) => ({
    MES: month,
    VALOR_PAGO: MONTHLY_VALUES_2026[month],
    SIGLA: MUNICIPIO,
  }));
  const updatedData = [...filtered, ...updates].sort((a, b) => Number(a.MES) - Number(b.MES));

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
          note: "2026 atualizado manualmente (MES=1 a MES=3).",
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
  console.log(`Transferências atualizadas: ${KEY}`);
  console.log(
    monthKeys
      .map((month) => `MES=${month}, VALOR_PAGO=${MONTHLY_VALUES_2026[month]}`)
      .join(" | "),
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
