import path from "path";
import { promises as fs } from "fs";
import OpenAI from "openai";
import { MongoClient } from "mongodb";

const root = process.cwd();

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
          (value.startsWith("\"") && value.endsWith("\"")) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      });
  } catch {
    // ignore
  }
}

await loadEnvFile(path.join(root, ".env.local"));
await loadEnvFile(path.join(root, ".env"));

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "maioazul";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_BLOG_MODEL || process.env.OPENAI_MODEL || "gpt-5.4";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI.");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY.");
  process.exit(1);
}

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [k, v] = arg.split("=");
    return [k, v ?? "true"];
  })
);
const lookbackHours = Number(args.get("--lookback-hours") ?? 24 * 14);
const maxPosts = Number(args.get("--max-posts") ?? 6);
const dryRun = args.get("--dry-run") === "true";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function parseJsonFromText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildPrompt({ metricName, category, year, facts }) {
  return [
    "Escreve um artigo curto em português europeu para leitores não técnicos.",
    "Objetivo: explicar uma métrica nova do dashboard de forma simples e útil.",
    "Regras obrigatórias:",
    "- Não inventar números nem contexto fora dos factos fornecidos.",
    "- Tom humano, claro, frases curtas e concretas.",
    "- Incluir: o que mudou, porque importa, e o que observar nos próximos meses.",
    "- Se não houver comparação histórica, diz explicitamente que é um ponto de referência inicial.",
    "- Evitar jargão estatístico.",
    "Devolve APENAS JSON válido com esta estrutura:",
    '{ "title": string, "summary": string, "body_md": string, "key_points": string[] }',
    "",
    `Métrica: ${metricName}`,
    `Categoria: ${category}`,
    `Ano de referência: ${year}`,
    `Factos: ${JSON.stringify(facts)}`,
  ].join("\n");
}

const client = new OpenAI({ apiKey: OPENAI_API_KEY });
const mongo = new MongoClient(MONGODB_URI);
await mongo.connect();

try {
  const db = mongo.db(MONGODB_DB);
  const metricsCol = db.collection("maio_core_metrics");
  const blogCol = db.collection("metric_blog_posts");

  await blogCol.createIndex({ slug: 1 }, { unique: true });
  await blogCol.createIndex({ metricKeys: 1 });
  await blogCol.createIndex({ status: 1, createdAt: -1 });

  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const recentRows = await metricsCol
    .find({
      island: "Maio",
      municipality: "Maio",
      updatedAt: { $gte: since },
      value: { $type: "number" },
      metric: { $exists: true, $ne: null },
      category: { $exists: true, $ne: null },
      year: { $exists: true, $ne: null },
    })
    .sort({ updatedAt: -1 })
    .limit(300)
    .toArray();

  const unique = new Map();
  for (const row of recentRows) {
    const year = Number(row?.year);
    const category = String(row?.category ?? "").trim();
    const metric = String(row?.metric ?? "").trim();
    const value = toNumber(row?.value);
    if (!year || !category || !metric || value == null) continue;
    const key = `maio_core_metrics:${year}:${category}:${metric}`;
    if (!unique.has(key)) {
      unique.set(key, {
        key,
        year,
        category,
        metric,
        unit: row?.unit ? String(row.unit) : null,
        value,
      });
    }
  }

  const candidates = Array.from(unique.values()).slice(0, Math.max(1, Math.floor(maxPosts)));
  let created = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const already = await blogCol.countDocuments({ metricKeys: candidate.key }, { limit: 1 });
    if (already > 0) {
      skipped += 1;
      continue;
    }

    const previous = await metricsCol.findOne({
      island: "Maio",
      municipality: "Maio",
      category: candidate.category,
      metric: candidate.metric,
      year: candidate.year - 1,
    });
    const prevValue = toNumber(previous?.value);
    const deltaAbs = prevValue == null ? null : candidate.value - prevValue;
    const deltaPct = prevValue && prevValue !== 0 ? (deltaAbs / prevValue) * 100 : null;

    const facts = [
      {
        label: "Valor atual",
        value: candidate.value,
        unit: candidate.unit,
        context: `Ano ${candidate.year}`,
      },
      ...(prevValue == null
        ? []
        : [
            {
              label: "Valor anterior",
              value: prevValue,
              unit: candidate.unit,
              context: `Ano ${candidate.year - 1}`,
            },
          ]),
      ...(deltaAbs == null
        ? []
        : [
            {
              label: "Variação absoluta",
              value: deltaAbs,
              unit: candidate.unit,
              context: `${candidate.year - 1} para ${candidate.year}`,
            },
          ]),
      ...(deltaPct == null
        ? []
        : [
            {
              label: "Variação percentual",
              value: Number(deltaPct.toFixed(2)),
              unit: "%",
              context: `${candidate.year - 1} para ${candidate.year}`,
            },
          ]),
    ];

    const response = await client.responses.create({
      model: MODEL,
      temperature: 0.3,
      input: buildPrompt({
        metricName: candidate.metric,
        category: candidate.category,
        year: candidate.year,
        facts,
      }),
    });

    const parsed = parseJsonFromText(response.output_text ?? "");
    if (!parsed || typeof parsed !== "object") {
      skipped += 1;
      continue;
    }

    const title = String(parsed.title ?? "").trim();
    const summary = String(parsed.summary ?? "").trim();
    const bodyMd = String(parsed.body_md ?? "").trim();
    if (!title || !summary || !bodyMd) {
      skipped += 1;
      continue;
    }

    const baseSlug = slugify(`${candidate.year}-${candidate.metric}-${title}`);
    const slug = baseSlug || slugify(`${candidate.year}-${candidate.metric}`);
    const now = new Date();
    const doc = {
      slug,
      title,
      summary,
      bodyMd,
      metricKeys: [candidate.key],
      year: candidate.year,
      sourceDataset: "maio_core_metrics",
      facts,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    };

    if (dryRun) {
      console.log("[dry-run] would create:", doc.slug);
      created += 1;
      continue;
    }

    try {
      await blogCol.insertOne(doc);
      created += 1;
      console.log("Created draft:", doc.slug);
    } catch (error) {
      console.error("Skip insert:", candidate.key, error?.message ?? error);
      skipped += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        lookbackHours,
        maxPosts,
        dryRun,
        scannedRecentRows: recentRows.length,
        candidateMetrics: candidates.length,
        created,
        skipped,
      },
      null,
      2
    )
  );
} finally {
  await mongo.close();
}

