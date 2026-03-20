import OpenAI from "openai";
import clientPromise from "@/lib/mongodb";

type GenerateOptions = {
  lookbackHours?: number;
  maxPosts?: number;
  model?: string;
};

type MetricCandidate = {
  key: string;
  year: number;
  category: string;
  metric: string;
  unit: string | null;
  value: number;
};

type MetricFact = {
  label: string;
  value: number;
  unit?: string | null;
  context?: string | null;
};

type GeneratedPayload = {
  title: string;
  summary: string;
  body_md: string;
  key_points?: string[];
};

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function parseJsonFromText(text: string): GeneratedPayload | null {
  if (!text) return null;

  const parse = (raw: string) => {
    const parsed = JSON.parse(raw) as GeneratedPayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (
      typeof parsed.title !== "string" ||
      typeof parsed.summary !== "string" ||
      typeof parsed.body_md !== "string"
    ) {
      return null;
    }
    return parsed;
  };

  try {
    return parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function buildPrompt(args: {
  metricName: string;
  category: string;
  year: number;
  facts: MetricFact[];
}) {
  const { metricName, category, year, facts } = args;
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

export async function generateMetricBlogDrafts(options?: GenerateOptions) {
  const lookbackHours = Math.max(1, Math.floor(options?.lookbackHours ?? 24 * 14));
  const maxPosts = Math.max(1, Math.min(20, Math.floor(options?.maxPosts ?? 6)));
  const apiKey = process.env.OPENAI_API_KEY;
  const model = options?.model ?? process.env.OPENAI_BLOG_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.4";

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const client = await clientPromise;
  const db = client.db();
  const metricsCol = db.collection("maio_core_metrics");
  const blogCol = db.collection("metric_blog_posts");
  const openai = new OpenAI({ apiKey });

  await Promise.all([
    blogCol.createIndex({ slug: 1 }, { unique: true }),
    blogCol.createIndex({ metricKeys: 1 }),
    blogCol.createIndex({ status: 1, createdAt: -1 }),
  ]);

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

  const unique = new Map<string, MetricCandidate>();
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

  const candidates = Array.from(unique.values()).slice(0, maxPosts);
  let created = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const exists = await blogCol.countDocuments({ metricKeys: candidate.key }, { limit: 1 });
    if (exists > 0) {
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
    const deltaPct =
      prevValue != null && prevValue !== 0 && deltaAbs != null
        ? (deltaAbs / prevValue) * 100
        : null;

    const facts: MetricFact[] = [
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
            } as MetricFact,
          ]),
      ...(deltaAbs == null
        ? []
        : [
            {
              label: "Variação absoluta",
              value: deltaAbs,
              unit: candidate.unit,
              context: `${candidate.year - 1} para ${candidate.year}`,
            } as MetricFact,
          ]),
      ...(deltaPct == null
        ? []
        : [
            {
              label: "Variação percentual",
              value: Number(deltaPct.toFixed(2)),
              unit: "%",
              context: `${candidate.year - 1} para ${candidate.year}`,
            } as MetricFact,
          ]),
    ];

    const response = await openai.responses.create({
      model,
      temperature: 0.3,
      input: buildPrompt({
        metricName: candidate.metric,
        category: candidate.category,
        year: candidate.year,
        facts,
      }),
    });

    const payload = parseJsonFromText(response.output_text ?? "");
    if (!payload) {
      skipped += 1;
      continue;
    }

    const title = payload.title.trim();
    const summary = payload.summary.trim();
    const bodyMd = payload.body_md.trim();
    if (!title || !summary || !bodyMd) {
      skipped += 1;
      continue;
    }

    const now = new Date();
    const slug = slugify(`${candidate.year}-${candidate.metric}-${title}`);
    if (!slug) {
      skipped += 1;
      continue;
    }

    try {
      await blogCol.insertOne({
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
      });
      created += 1;
    } catch {
      skipped += 1;
    }
  }

  return {
    lookbackHours,
    maxPosts,
    scannedRecentRows: recentRows.length,
    candidateMetrics: candidates.length,
    created,
    skipped,
  };
}
