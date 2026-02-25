import path from "path";
import { promises as fs } from "fs";
import { MongoClient } from "mongodb";

const root = process.cwd();

const DATA = [
  {
    dataset: "receitas_cv_recebedorias",
    year: 2024,
    rows: [
      { recebedoria: "Boa Vista", value: 855091672 },
      { recebedoria: "Brava", value: 41044170 },
      { recebedoria: "Exterior", value: 0 },
      { recebedoria: "Fogo", value: 399928087 },
      { recebedoria: "Maio", value: 68231506 },
      { recebedoria: "Outras fontes", value: 334524151 },
      { recebedoria: "Sal", value: 10937872334 },
      { recebedoria: "Santiago", value: 47966526605 },
      { recebedoria: "Santo Antão", value: 3364019019 },
      { recebedoria: "São Nicolau", value: 171354008 },
      { recebedoria: "São Vicente", value: 5333800987 },
      { recebedoria: "Várias Ilhas de Cabo Verde", value: 0 },
    ],
    total: 69472392539,
  },
  {
    dataset: "receitas_cv_recebedorias",
    year: 2025,
    rows: [
      { recebedoria: "Boa Vista", value: 1029322996 },
      { recebedoria: "Brava", value: 46306538 },
      { recebedoria: "Exterior", value: 0 },
      { recebedoria: "Fogo", value: 398019374 },
      { recebedoria: "Maio", value: 64024623 },
      { recebedoria: "Outras fontes", value: 0 },
      { recebedoria: "Sal", value: 14161768812 },
      { recebedoria: "Santiago", value: 64105724175 },
      { recebedoria: "Santo Antão", value: 3006832326 },
      { recebedoria: "São Nicolau", value: 163052574 },
      { recebedoria: "São Vicente", value: 6427726045 },
      { recebedoria: "Várias Ilhas de Cabo Verde", value: 0 },
    ],
    total: 89402777463,
  },
  {
    dataset: "receitas_cv_recebedorias",
    year: 2026,
    rows: [
      { recebedoria: "Boa Vista", value: 88279986 },
      { recebedoria: "Brava", value: 4180910 },
      { recebedoria: "Exterior", value: 0 },
      { recebedoria: "Fogo", value: 34203322 },
      { recebedoria: "Maio", value: 6424792 },
      { recebedoria: "Outras fontes", value: 0 },
      { recebedoria: "Sal", value: 1255162600 },
      { recebedoria: "Santiago", value: 4294483183 },
      { recebedoria: "Santo Antão", value: 182141318 },
      { recebedoria: "São Nicolau", value: 12113466 },
      { recebedoria: "São Vicente", value: 575709623 },
      { recebedoria: "Várias Ilhas de Cabo Verde", value: 0 },
    ],
    total: 6452699200,
  },
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

const run = async () => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);
  const col = db.collection("receitas_cv_recebedorias");

  await col.createIndex({ dataset: 1, year: 1 }, { unique: true });

  let inserted = 0;
  let updated = 0;

  for (const row of DATA) {
    const res = await col.updateOne(
      { dataset: row.dataset, year: row.year },
      {
        $set: {
          ...row,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (res.upsertedCount === 1) inserted += 1;
    else if (res.modifiedCount === 1) updated += 1;
  }

  await client.close();
  console.log("Receitas CV upsert complete");
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
