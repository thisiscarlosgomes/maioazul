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
      { recebedoria: "Boa Vista", value: 153773334 },
      { recebedoria: "Brava", value: 5956149 },
      { recebedoria: "Exterior", value: 0 },
      { recebedoria: "Fogo", value: 61503908 },
      { recebedoria: "Maio", value: 10434981 },
      { recebedoria: "Outras fontes", value: 0 },
      { recebedoria: "Sal", value: 2398399928 },
      { recebedoria: "Santiago", value: 7657993671 },
      { recebedoria: "Santo Antão", value: 256944813 },
      { recebedoria: "São Nicolau", value: 24805974 },
      { recebedoria: "São Vicente", value: 990992905 },
      { recebedoria: "Várias Ilhas de Cabo Verde", value: 0 },
    ],
    total: 11560805663,
  },
];

const SNAPSHOT_COLLECTION = "receitas_cv_recebedorias_snapshots";
const ACTIVE_COLLECTION = "receitas_cv_recebedorias";
const SNAPSHOT_TARGET_YEAR = 2026;

function normalizeRows(rows = []) {
  return rows
    .map((row) => ({
      recebedoria: String(row.recebedoria ?? "").trim(),
      value: Number(row.value ?? 0),
    }))
    .filter((row) => row.recebedoria.length > 0);
}

function stableRowsSignature(rows = []) {
  return JSON.stringify(
    normalizeRows(rows)
      .slice()
      .sort((a, b) => a.recebedoria.localeCompare(b.recebedoria))
      .map((row) => [row.recebedoria, row.value]),
  );
}

function docsDiffer(existing, incoming) {
  if (!existing) return true;
  if (Number(existing.total ?? 0) !== Number(incoming.total ?? 0)) return true;
  return stableRowsSignature(existing.rows) !== stableRowsSignature(incoming.rows);
}

async function loadDataOverride() {
  const dataFile = process.env.RECEITAS_CV_DATA_FILE?.trim();
  if (!dataFile) return null;

  const resolved = path.isAbsolute(dataFile)
    ? dataFile
    : path.join(process.cwd(), dataFile);
  const raw = await fs.readFile(resolved, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("RECEITAS_CV_DATA_FILE must contain a JSON array.");
  }

  return parsed;
}

function resolveSnapshotLabel(existingDoc, incomingDoc) {
  const explicit = process.env.RECEITAS_2026_SNAPSHOT_LABEL?.trim();
  if (explicit) return explicit;

  const previousLabel =
    typeof existingDoc?.revisionLabel === "string" ? existingDoc.revisionLabel.trim() : "";
  if (previousLabel) return previousLabel;

  const dtRaw = existingDoc?.updatedAt ?? incomingDoc?.updatedAt ?? new Date();
  const dt = dtRaw instanceof Date ? dtRaw : new Date(dtRaw);
  const month = Number.isFinite(dt.getTime()) ? dt.getUTCMonth() + 1 : 1;
  return `${SNAPSHOT_TARGET_YEAR}-${String(month).padStart(2, "0")}`;
}

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
  const dataOverride = await loadDataOverride();
  const records = dataOverride ?? DATA;

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);
  const col = db.collection(ACTIVE_COLLECTION);
  const snapshots = db.collection(SNAPSHOT_COLLECTION);

  await col.createIndex({ dataset: 1, year: 1 }, { unique: true });
  await snapshots.createIndex(
    { dataset: 1, year: 1, snapshotLabel: 1 },
    { unique: true },
  );

  let inserted = 0;
  let updated = 0;
  let snapshotted = 0;

  for (const row of records) {
    const existing = await col.findOne({ dataset: row.dataset, year: row.year });

    if (
      Number(row.year) === SNAPSHOT_TARGET_YEAR &&
      existing &&
      docsDiffer(existing, row)
    ) {
      const snapshotLabel = resolveSnapshotLabel(existing, row);
      await snapshots.updateOne(
        {
          dataset: existing.dataset,
          year: existing.year,
          snapshotLabel,
        },
        {
          $setOnInsert: {
            dataset: existing.dataset,
            year: existing.year,
            snapshotLabel,
            payload: {
              dataset: existing.dataset,
              year: existing.year,
              rows: normalizeRows(existing.rows),
              total: Number(existing.total ?? 0),
              updatedAt: existing.updatedAt ?? null,
              revisionLabel: existing.revisionLabel ?? null,
            },
            createdAt: new Date(),
          },
          $set: {
            sourceUpdatedAt: new Date(),
            note:
              process.env.RECEITAS_2026_SNAPSHOT_NOTE?.trim() ||
              "Snapshot automático antes de atualizar 2026.",
          },
        },
        { upsert: true },
      );
      snapshotted += 1;
    }

    const res = await col.updateOne(
      { dataset: row.dataset, year: row.year },
      {
        $set: {
          ...row,
          rows: normalizeRows(row.rows),
          total: Number(row.total ?? 0),
          revisionLabel:
            Number(row.year) === SNAPSHOT_TARGET_YEAR
              ? process.env.RECEITAS_2026_REVISION_LABEL?.trim() || row.revisionLabel || null
              : row.revisionLabel || null,
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
  console.log(`Snapshots created/updated: ${snapshotted}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
