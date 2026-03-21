import OpenAI from "openai";
import type { Collection, Document } from "mongodb";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import clientPromise from "@/lib/mongodb";
import { generateBlogHeroImage } from "@/lib/blog/images";

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

type PromptGeneratedPayload = {
  posts: Array<{
    title: string;
    summary: string;
    body_md: string;
    metric_keys?: string[];
    year?: number | null;
  }>;
};

const BLOG_SOURCE_YEARS = [2026, 2025, 2024] as const;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
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
    "- Artigo curto: no máximo 4 parágrafos no total.",
    "- No máximo 2 secções com subtítulos (##).",
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

function enforceShortArticleBody(bodyMd: string) {
  const source = String(bodyMd || "").trim();
  if (!source) return source;

  const blocks = source
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  let sections = 0;
  let paragraphs = 0;
  const out: string[] = [];

  for (const block of blocks) {
    const firstLine = block.split("\n")[0]?.trim() ?? "";
    const isHeading = /^##\s+/.test(firstLine);
    const isTitle = /^#\s+/.test(firstLine);

    if (isTitle) {
      continue;
    }

    if (isHeading) {
      if (sections >= 2) continue;
      sections += 1;
      out.push(block);
      continue;
    }

    if (paragraphs >= 4) continue;
    paragraphs += 1;
    out.push(block);
  }

  return out.join("\n\n").trim();
}

function getDashboardBaseUrl() {
  const envBaseUrl =
    process.env.DASHBOARD_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return envBaseUrl || "https://www.maioazul.com";
}

function buildDashboardUrl(path: string, query?: Record<string, string | number | null | undefined>) {
  const url = new URL(path, getDashboardBaseUrl());
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function fetchDashboardJson(
  path: string,
  query?: Record<string, string | number | null | undefined>
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(buildDashboardUrl(path, query), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function upsertMetric(
  map: Map<string, MetricCandidate>,
  item: {
    key: string;
    year: number;
    category: string;
    metric: string;
    value: unknown;
    unit?: string | null;
  }
) {
  const parsed = toNumber(item.value);
  if (parsed == null) return;
  if (!item.year || !item.category || !item.metric) return;
  if (map.has(item.key)) return;
  map.set(item.key, {
    key: item.key,
    year: item.year,
    category: item.category,
    metric: item.metric,
    value: parsed,
    unit: item.unit ?? null,
  });
}

async function appendTourismDashboardMetrics(metricMap: Map<string, MetricCandidate>) {
  for (const year of BLOG_SOURCE_YEARS) {
    const [overviewPayload, pressurePayload, seasonalityPayload, populationPayload] =
      await Promise.all([
        fetchDashboardJson("/api/transparencia/turismo/overview", { year }),
        fetchDashboardJson("/api/transparencia/turismo/pressure", { year }),
        fetchDashboardJson("/api/transparencia/turismo/seasonality", { year }),
        fetchDashboardJson("/api/transparencia/turismo/population", { year }),
      ]);

    const islands = Array.isArray(overviewPayload?.islands) ? overviewPayload.islands : [];
    const maioOverview = islands.find(
      (row) =>
        row &&
        typeof row === "object" &&
        String((row as { ilha?: unknown }).ilha ?? "").toLowerCase() === "maio"
    ) as
      | {
          hospedes?: unknown;
          dormidas?: unknown;
          avg_stay?: unknown;
          occupancy_rate?: unknown;
          domestic_share?: unknown;
        }
      | undefined;

    if (maioOverview) {
      upsertMetric(metricMap, {
        key: `turismo_overview:${year}:maio:hospedes`,
        year,
        category: "Turismo",
        metric: "Hóspedes (Maio)",
        value: maioOverview.hospedes,
        unit: null,
      });
      upsertMetric(metricMap, {
        key: `turismo_overview:${year}:maio:dormidas`,
        year,
        category: "Turismo",
        metric: "Dormidas (Maio)",
        value: maioOverview.dormidas,
        unit: null,
      });
      upsertMetric(metricMap, {
        key: `turismo_overview:${year}:maio:avg_stay`,
        year,
        category: "Turismo",
        metric: "Estadia média (Maio)",
        value: maioOverview.avg_stay,
        unit: "dias",
      });
      upsertMetric(metricMap, {
        key: `turismo_overview:${year}:maio:occupancy_rate`,
        year,
        category: "Turismo",
        metric: "Taxa de ocupação (Maio)",
        value: maioOverview.occupancy_rate,
        unit: "%",
      });
      upsertMetric(metricMap, {
        key: `turismo_overview:${year}:maio:domestic_share`,
        year,
        category: "Turismo",
        metric: "Peso do turismo interno (Maio)",
        value: maioOverview.domestic_share,
        unit: "%",
      });
    }

    const pressureRows = Array.isArray(pressurePayload?.data) ? pressurePayload.data : [];
    const maioPressure = pressureRows.find(
      (row) =>
        row &&
        typeof row === "object" &&
        String((row as { ilha?: unknown }).ilha ?? "").toLowerCase() === "maio"
    ) as
      | {
          pressure_index?: unknown;
        }
      | undefined;
    if (maioPressure) {
      upsertMetric(metricMap, {
        key: `turismo_pressure:${year}:maio:index`,
        year,
        category: "Turismo",
        metric: "Índice de pressão turística (Maio)",
        value: maioPressure.pressure_index,
        unit: null,
      });
    }

    const seasonalityRows = Array.isArray(seasonalityPayload?.data)
      ? seasonalityPayload.data
      : [];
    const maioSeasonality = seasonalityRows.find(
      (row) =>
        row &&
        typeof row === "object" &&
        String((row as { ilha?: unknown }).ilha ?? "").toLowerCase() === "maio"
    ) as
      | {
          seasonality_index?: unknown;
          q1_dormidas?: unknown;
          q3_dormidas?: unknown;
        }
      | undefined;
    if (maioSeasonality) {
      upsertMetric(metricMap, {
        key: `turismo_seasonality:${year}:maio:index`,
        year,
        category: "Turismo",
        metric: "Índice de sazonalidade (Maio)",
        value: maioSeasonality.seasonality_index,
        unit: null,
      });
      upsertMetric(metricMap, {
        key: `turismo_seasonality:${year}:maio:q1_dormidas`,
        year,
        category: "Turismo",
        metric: "Dormidas Q1 (Maio)",
        value: maioSeasonality.q1_dormidas,
        unit: null,
      });
      upsertMetric(metricMap, {
        key: `turismo_seasonality:${year}:maio:q3_dormidas`,
        year,
        category: "Turismo",
        metric: "Dormidas Q3 (Maio)",
        value: maioSeasonality.q3_dormidas,
        unit: null,
      });
    }

    const populationRows = Array.isArray(populationPayload?.data) ? populationPayload.data : [];
    const maioPopulation = populationRows.find(
      (row) =>
        row &&
        typeof row === "object" &&
        String((row as { ilha?: unknown }).ilha ?? "").toLowerCase() === "maio"
    ) as
      | {
          population?: unknown;
          population_share_national?: unknown;
        }
      | undefined;
    if (maioPopulation) {
      upsertMetric(metricMap, {
        key: `turismo_population:${year}:maio:population`,
        year,
        category: "Turismo",
        metric: "População residente (Maio)",
        value: maioPopulation.population,
        unit: null,
      });
      upsertMetric(metricMap, {
        key: `turismo_population:${year}:maio:share_national`,
        year,
        category: "Turismo",
        metric: "Peso da população do Maio no nacional",
        value: maioPopulation.population_share_national,
        unit: "%",
      });
    }
  }
}

async function appendTransportDashboardMetrics(metricMap: Map<string, MetricCandidate>) {
  const payload = await fetchDashboardJson("/api/transparencia/transportes/overview", { year: 2025 });
  if (!payload) return;

  const maritime = (payload.maritime ?? {}) as {
    ships_by_port_2025?: Array<{ island?: unknown; movements?: unknown }>;
    passengers_by_port_2025?: Array<{ island?: unknown; passengers?: unknown }>;
  };
  const air = (payload.air ?? {}) as {
    aircraft_by_airport_2025?: Array<{
      island?: unknown;
      domestic?: unknown;
      international?: unknown;
      total?: unknown;
    }>;
    passengers_by_airport_2025?: Array<{
      island?: unknown;
      embarked?: unknown;
      disembarked?: unknown;
      transit?: unknown;
      total?: unknown;
    }>;
  };

  const shipsMaio = (Array.isArray(maritime.ships_by_port_2025) ? maritime.ships_by_port_2025 : [])
    .filter((row) => String(row.island ?? "").toLowerCase() === "maio")
    .reduce((acc, row) => acc + (toNumber(row.movements) ?? 0), 0);
  const passengersPortMaio = (
    Array.isArray(maritime.passengers_by_port_2025) ? maritime.passengers_by_port_2025 : []
  )
    .filter((row) => String(row.island ?? "").toLowerCase() === "maio")
    .reduce((acc, row) => acc + (toNumber(row.passengers) ?? 0), 0);
  const aircraftMaio = (Array.isArray(air.aircraft_by_airport_2025) ? air.aircraft_by_airport_2025 : [])
    .filter((row) => String(row.island ?? "").toLowerCase() === "maio")
    .reduce((acc, row) => acc + (toNumber(row.total) ?? 0), 0);
  const airPassengersMaio = (
    Array.isArray(air.passengers_by_airport_2025) ? air.passengers_by_airport_2025 : []
  )
    .filter((row) => String(row.island ?? "").toLowerCase() === "maio")
    .reduce((acc, row) => acc + (toNumber(row.total) ?? 0), 0);

  upsertMetric(metricMap, {
    key: "transportes:2025:maio:navios_movimentos",
    year: 2025,
    category: "Transportes",
    metric: "Movimentos marítimos (Maio)",
    value: shipsMaio,
    unit: null,
  });
  upsertMetric(metricMap, {
    key: "transportes:2025:maio:passageiros_porto",
    year: 2025,
    category: "Transportes",
    metric: "Passageiros marítimos (Maio)",
    value: passengersPortMaio,
    unit: null,
  });
  upsertMetric(metricMap, {
    key: "transportes:2025:maio:movimentos_aereos",
    year: 2025,
    category: "Transportes",
    metric: "Movimentos aéreos (Maio)",
    value: aircraftMaio,
    unit: null,
  });
  upsertMetric(metricMap, {
    key: "transportes:2025:maio:passageiros_aereos",
    year: 2025,
    category: "Transportes",
    metric: "Passageiros aéreos (Maio)",
    value: airPassengersMaio,
    unit: null,
  });
}

async function appendEnergyDashboardMetrics(metricMap: Map<string, MetricCandidate>) {
  const payload = await fetchDashboardJson("/api/transparencia/municipal/maio/energia");
  if (!payload) return;
  const summary = (payload.summary ?? {}) as {
    annualDemandGwh?: {
      planningForecast2025?: unknown;
      impliedCurrentFromSolarPlantReport?: unknown;
      recommendedWorkingValueGwh?: unknown;
      lowerBoundGwh?: unknown;
      upperBoundGwh?: unknown;
    };
    solarPlantReference?: {
      installedCapacityKwp?: unknown;
      expectedAnnualGenerationMwh?: unknown;
      reportedShareOfDemandPercent?: unknown;
    };
  };

  upsertMetric(metricMap, {
    key: "energia:2025:maio:demanda_recomendada_gwh",
    year: 2025,
    category: "Energia",
    metric: "Demanda anual recomendada (GWh)",
    value: summary.annualDemandGwh?.recommendedWorkingValueGwh,
    unit: "GWh",
  });
  upsertMetric(metricMap, {
    key: "energia:2025:maio:demanda_planeada_gwh",
    year: 2025,
    category: "Energia",
    metric: "Previsão de procura elétrica (GWh)",
    value: summary.annualDemandGwh?.planningForecast2025,
    unit: "GWh",
  });
  upsertMetric(metricMap, {
    key: "energia:2025:maio:geracao_solar_mwh",
    year: 2025,
    category: "Energia",
    metric: "Geração solar anual esperada",
    value: summary.solarPlantReference?.expectedAnnualGenerationMwh,
    unit: "MWh",
  });
  upsertMetric(metricMap, {
    key: "energia:2025:maio:cobertura_solar_percent",
    year: 2025,
    category: "Energia",
    metric: "Cobertura estimada da procura por solar",
    value: summary.solarPlantReference?.reportedShareOfDemandPercent,
    unit: "%",
  });
}

async function appendBudgetDashboardMetrics(metricMap: Map<string, MetricCandidate>) {
  for (const year of [2025, 2026]) {
    const payload = await fetchDashboardJson("/api/transparencia/municipal/maio/orcamento", { year });
    if (!payload) continue;
    const summary = (payload.summary ?? {}) as {
      totalRevenue?: unknown;
      totalExpenditure?: unknown;
      investmentProgramTotal?: unknown;
      personnelExpenses?: unknown;
      capitalExpenses?: unknown;
    };
    upsertMetric(metricMap, {
      key: `orcamento:${year}:maio:receita_total`,
      year,
      category: "Orçamento",
      metric: "Receita total",
      value: summary.totalRevenue,
      unit: "CVE",
    });
    upsertMetric(metricMap, {
      key: `orcamento:${year}:maio:despesa_total`,
      year,
      category: "Orçamento",
      metric: "Despesa total",
      value: summary.totalExpenditure,
      unit: "CVE",
    });
    upsertMetric(metricMap, {
      key: `orcamento:${year}:maio:investimento_total`,
      year,
      category: "Orçamento",
      metric: "Programa de investimento",
      value: summary.investmentProgramTotal,
      unit: "CVE",
    });
    upsertMetric(metricMap, {
      key: `orcamento:${year}:maio:despesa_pessoal`,
      year,
      category: "Orçamento",
      metric: "Despesas com pessoal",
      value: summary.personnelExpenses,
      unit: "CVE",
    });
    upsertMetric(metricMap, {
      key: `orcamento:${year}:maio:despesa_capital`,
      year,
      category: "Orçamento",
      metric: "Despesas de capital",
      value: summary.capitalExpenses,
      unit: "CVE",
    });
  }
}

function getSeriesValueByName(
  rows: unknown,
  name: string,
  year: string
) {
  if (!Array.isArray(rows)) return null;
  const row = rows.find(
    (item) =>
      item &&
      typeof item === "object" &&
      String((item as { name?: unknown }).name ?? "").toLowerCase() === name.toLowerCase()
  ) as
    | {
        values?: Record<string, unknown>;
      }
    | undefined;
  if (!row?.values || typeof row.values !== "object") return null;
  return toNumber(row.values[year]);
}

function getAnnualValueByName(rows: unknown, name: string, year: string) {
  if (!Array.isArray(rows)) return null;
  const row = rows.find(
    (item) =>
      item &&
      typeof item === "object" &&
      String((item as { name?: unknown }).name ?? "").toLowerCase() === name.toLowerCase()
  ) as
    | {
        annual?: Record<string, unknown>;
      }
    | undefined;
  if (!row?.annual || typeof row.annual !== "object") return null;
  return toNumber(row.annual[year]);
}

async function appendPaymentSystemMetrics(metricMap: Map<string, MetricCandidate>) {
  const payload = await fetchDashboardJson("/api/finance/datasets", {
    dataset: "payment_system_2019_2023",
  });
  if (!payload) return;
  const year = "2023";

  upsertMetric(metricMap, {
    key: "payment_system:2023:maio:banking_structure",
    year: Number(year),
    category: "Sistema de Pagamentos",
    metric: "Balcões/estrutura bancária (Maio)",
    value: getSeriesValueByName(payload.banking_structure_by_island, "Maio", year),
    unit: null,
  });
  upsertMetric(metricMap, {
    key: "payment_system:2023:maio:atm_terminals",
    year: Number(year),
    category: "Sistema de Pagamentos",
    metric: "Terminais ATM (Maio)",
    value: getSeriesValueByName(payload.atm_terminals_by_island, "Maio", year),
    unit: null,
  });
  upsertMetric(metricMap, {
    key: "payment_system:2023:maio:pos_terminals",
    year: Number(year),
    category: "Sistema de Pagamentos",
    metric: "Terminais POS (Maio)",
    value: getSeriesValueByName(payload.pos_terminals_by_island, "Maio", year),
    unit: null,
  });
  upsertMetric(metricMap, {
    key: "payment_system:2023:maio:atm_population_coverage",
    year: Number(year),
    category: "Sistema de Pagamentos",
    metric: "Cobertura populacional por ATM (Maio)",
    value: getSeriesValueByName(payload.atm_population_coverage_by_municipality, "Maio", year),
    unit: "habitantes/ATM",
  });
}

async function appendExternalSectorMetrics(metricMap: Map<string, MetricCandidate>) {
  const payload = await fetchDashboardJson("/api/finance/datasets", {
    dataset: "external_sector_bcv_2025",
  });
  if (!payload) return;

  const remessasData = (payload.remessasEmigrantes ?? {}) as {
    totals?: { annual?: Record<string, unknown> };
    destino_concelhos_annual?: unknown;
  };
  const ideData = (payload.ideCaboVerde ?? {}) as {
    totals?: { annual?: Record<string, unknown> };
    by_destination_island?: unknown;
  };
  const years = ["2023", "2024", "2025"];

  for (const year of years) {
    upsertMetric(metricMap, {
      key: `external_sector:${year}:cv:remessas_total`,
      year: Number(year),
      category: "Setor Externo",
      metric: "Remessas de emigrantes (total nacional)",
      value: remessasData.totals?.annual?.[year],
      unit: "milhões CVE",
    });
    upsertMetric(metricMap, {
      key: `external_sector:${year}:cv:ide_total`,
      year: Number(year),
      category: "Setor Externo",
      metric: "IDE total (nacional)",
      value: ideData.totals?.annual?.[year],
      unit: "milhões CVE",
    });
    upsertMetric(metricMap, {
      key: `external_sector:${year}:maio:remessas_recebidas`,
      year: Number(year),
      category: "Setor Externo",
      metric: "Remessas recebidas no Maio",
      value: getAnnualValueByName(remessasData.destino_concelhos_annual, "Maio", year),
      unit: "milhões CVE",
    });
    upsertMetric(metricMap, {
      key: `external_sector:${year}:maio:ide_recebido`,
      year: Number(year),
      category: "Setor Externo",
      metric: "IDE recebido no Maio",
      value: getAnnualValueByName(ideData.by_destination_island, "Maio", year),
      unit: "milhões CVE",
    });
  }
}

async function appendLegalCodeMetrics(metricMap: Map<string, MetricCandidate>) {
  const envPath = process.env.LEGAL_CODE_CHUNKS_PATH?.trim();
  const candidatePaths = [
    envPath,
    envPath ? join(envPath, "chunks.jsonl") : null,
    resolve(process.cwd(), "data/codigo_postura/chunks.jsonl"),
    resolve(process.cwd(), "../data/codigo_postura/chunks.jsonl"),
  ].filter((value): value is string => Boolean(value));

  let raw = "";
  for (const path of candidatePaths) {
    try {
      raw = await readFile(path, "utf8");
      if (raw.trim()) break;
    } catch {
      continue;
    }
  }
  if (!raw.trim()) return;

  const rows = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as {
          article_number?: number | null;
          page_start?: number | null;
          page_end?: number | null;
        };
      } catch {
        return null;
      }
    })
    .filter((item): item is { article_number?: number | null; page_start?: number | null; page_end?: number | null } =>
      Boolean(item)
    );

  const articleNumbers = [...new Set(rows.map((row) => Number(row.article_number)).filter(Number.isFinite))]
    .filter((value) => value > 0)
    .sort((a, b) => a - b);

  const minPage = rows
    .map((row) => Number(row.page_start))
    .filter(Number.isFinite)
    .reduce((acc, value) => Math.min(acc, value), Number.POSITIVE_INFINITY);
  const maxPage = rows
    .map((row) => Number(row.page_end))
    .filter(Number.isFinite)
    .reduce((acc, value) => Math.max(acc, value), 0);

  upsertMetric(metricMap, {
    key: "codigo_postura:2026:corpus:chunks",
    year: 2026,
    category: "Código de Postura",
    metric: "Blocos indexados do código",
    value: rows.length,
    unit: null,
  });
  upsertMetric(metricMap, {
    key: "codigo_postura:2026:corpus:articles",
    year: 2026,
    category: "Código de Postura",
    metric: "Artigos disponíveis no código",
    value: articleNumbers.length,
    unit: null,
  });
  upsertMetric(metricMap, {
    key: "codigo_postura:2026:corpus:pages_covered",
    year: 2026,
    category: "Código de Postura",
    metric: "Páginas cobertas no corpus",
    value: Number.isFinite(minPage) && Number.isFinite(maxPage) ? maxPage - minPage + 1 : null,
    unit: "páginas",
  });

  for (const articleNumber of articleNumbers.slice(0, 120)) {
    upsertMetric(metricMap, {
      key: `codigo_postura:2026:article:${articleNumber}`,
      year: 2026,
      category: "Código de Postura",
      metric: `Artigo ${articleNumber} disponível`,
      value: 1,
      unit: null,
    });
  }
}

function prioritizeMetricCatalog(
  metricCatalog: MetricCandidate[],
  instruction: string,
  maxItems = 180
) {
  const lowerInstruction = instruction.toLowerCase();
  const tokens = lowerInstruction
    .split(/[^a-z0-9à-ÿ]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .slice(0, 20);
  const yearsInPrompt = Array.from(instruction.matchAll(/\b(20\d{2})\b/g)).map((m) =>
    Number(m[1])
  );

  const ranked = [...metricCatalog].sort((a, b) => {
    const score = (item: MetricCandidate) => {
      const haystack = `${item.metric} ${item.category} ${item.key}`.toLowerCase();
      let value = 0;
      if (yearsInPrompt.includes(item.year)) value += 8;
      if (
        lowerInstruction.includes("turis") ||
        lowerInstruction.includes("hosped") ||
        lowerInstruction.includes("dormid") ||
        lowerInstruction.includes("sazon")
      ) {
        if (
          haystack.includes("turis") ||
          haystack.includes("hosped") ||
          haystack.includes("dormid") ||
          haystack.includes("sazon") ||
          haystack.includes("ocup")
        ) {
          value += 10;
        }
      }
      for (const token of tokens) {
        if (haystack.includes(token)) value += 3;
      }
      return value;
    };
    return score(b) - score(a);
  });

  return ranked.slice(0, maxItems);
}

function buildInstructionPrompt(args: {
  instruction: string;
  maxPosts: number;
  metricCatalog: Array<{
    key: string;
    metric: string;
    category: string;
    year: number;
    value: number;
    unit: string | null;
  }>;
}) {
  const metricLines = args.metricCatalog
    .slice(0, 180)
    .map(
      (item) =>
        `- ${item.key} | ${item.metric} | ${item.category} | ${item.year} | ${item.value}${item.unit ? ` ${item.unit}` : ""}`
    )
    .join("\n");

  return [
    "Escreve rascunhos de artigos em português europeu para o portal MaioAzul.",
    "Segue o pedido editorial do utilizador e usa os indicadores abaixo quando fizer sentido.",
    "Regras:",
    "- Tom humano, claro e útil para público geral.",
    "- Não inventar números nem factos fora dos dados disponíveis.",
    "- Produzir entre 1 e o máximo pedido de artigos.",
    "- Cada artigo deve ter título curto, resumo objetivo e corpo em markdown.",
    "- Cada artigo deve ter no máximo 4 parágrafos no total.",
    "- Cada artigo deve ter no máximo 2 secções (usar subtítulos ## quando fizer sentido).",
    "- Se o pedido for amplo, escolhe os ângulos mais relevantes.",
    "Responde APENAS com JSON válido no formato:",
    '{ "posts": [{ "title": string, "summary": string, "body_md": string, "metric_keys": string[], "year": number|null }] }',
    "",
    `Máximo de artigos: ${args.maxPosts}`,
    `Pedido editorial do utilizador: ${args.instruction}`,
    "",
    "Catálogo de métricas disponíveis (use os `key` em metric_keys quando aplicável):",
    metricLines || "- (sem métricas disponíveis)",
  ].join("\n");
}

function parsePromptJsonFromText(text: string): PromptGeneratedPayload | null {
  if (!text) return null;

  const parse = (raw: string) => {
    const parsed = JSON.parse(raw) as PromptGeneratedPayload;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.posts)) return null;

    const posts = parsed.posts
      .filter((post) => post && typeof post === "object")
      .map((post) => ({
        title: String(post.title ?? "").trim(),
        summary: String(post.summary ?? "").trim(),
        body_md: String(post.body_md ?? "").trim(),
        metric_keys: Array.isArray(post.metric_keys) ? post.metric_keys.map(String) : [],
        year:
          typeof post.year === "number" && Number.isFinite(post.year)
            ? Math.floor(post.year)
            : null,
      }))
      .filter((post) => post.title && post.summary && post.body_md);

    if (!posts.length) return null;
    return { posts };
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

function getDb(client: Awaited<typeof clientPromise>) {
  const dbName = process.env.MONGODB_DB?.trim();
  return dbName ? client.db(dbName) : client.db();
}

async function makeUniqueSlug(
  blogCol: Collection<Document>,
  title: string
) {
  const base = slugify(title) || `destaque-${Date.now()}`;
  let next = base;
  for (let i = 0; i < 20; i += 1) {
    const exists = await blogCol.countDocuments({ slug: next }, { limit: 1 });
    if (exists === 0) return next;
    next = `${base.slice(0, 80)}-${i + 1}`;
  }
  return `${base.slice(0, 70)}-${Date.now()}`;
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
  const db = getDb(client);
  const metricsCol = db.collection("maio_core_metrics");
  const blogCol = db.collection("metric_blog_posts");
  const openai = new OpenAI({ apiKey });

  await Promise.all([
    blogCol.createIndex({ slug: 1 }, { unique: true }),
    blogCol.createIndex({ metricKeys: 1 }),
    blogCol.createIndex({ status: 1, createdAt: -1 }),
  ]);

  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  let recentRows = await metricsCol
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

  if (!recentRows.length) {
    recentRows = await metricsCol
      .find({
        island: "Maio",
        municipality: "Maio",
        value: { $exists: true, $ne: null },
        metric: { $exists: true, $ne: null },
        category: { $exists: true, $ne: null },
        year: { $exists: true, $ne: null },
      })
      .sort({ updatedAt: -1 })
      .limit(300)
      .toArray();
  }

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
    const bodyMd = enforceShortArticleBody(payload.body_md);
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
      const heroImage = await generateBlogHeroImage({
        title,
        summary,
        bodyMd,
        slugSeed: slug,
      }).catch(() => null);

      await blogCol.insertOne({
        slug,
        title,
        summary,
        bodyMd,
        heroImageUrl: heroImage?.url ?? null,
        heroImageAlt: heroImage?.alt ?? title,
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

export async function generateBlogDraftsFromInstruction(options: {
  instruction: string;
  maxPosts?: number;
  model?: string;
}) {
  const instruction = options.instruction.trim();
  if (instruction.length < 8) {
    throw new Error("A instrução é demasiado curta.");
  }

  const maxPosts = Math.max(1, Math.min(10, Math.floor(options.maxPosts ?? 3)));
  const apiKey = process.env.OPENAI_API_KEY;
  const model = options.model ?? process.env.OPENAI_BLOG_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.4";

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const client = await clientPromise;
  const db = getDb(client);
  const metricsCol = db.collection("maio_core_metrics");
  const blogCol = db.collection("metric_blog_posts");
  const openai = new OpenAI({ apiKey });

  await Promise.all([
    blogCol.createIndex({ slug: 1 }, { unique: true }),
    blogCol.createIndex({ metricKeys: 1 }),
    blogCol.createIndex({ status: 1, createdAt: -1 }),
  ]);

  const sourceRows = await metricsCol
    .find({
      island: "Maio",
      municipality: "Maio",
      value: { $exists: true, $ne: null },
      metric: { $exists: true, $ne: null },
      category: { $exists: true, $ne: null },
      year: { $exists: true, $ne: null },
    })
    .sort({ updatedAt: -1 })
    .limit(400)
    .toArray();

  const metricMap = new Map<string, MetricCandidate>();
  for (const row of sourceRows) {
    const year = Number(row?.year);
    const category = String(row?.category ?? "").trim();
    const metric = String(row?.metric ?? "").trim();
    const value = toNumber(row?.value);
    if (!year || !category || !metric || value == null) continue;
    const key = `maio_core_metrics:${year}:${category}:${metric}`;
    if (!metricMap.has(key)) {
      metricMap.set(key, {
        key,
        year,
        category,
        metric,
        unit: row?.unit ? String(row.unit) : null,
        value,
      });
    }
  }

  await Promise.all([
    appendTourismDashboardMetrics(metricMap),
    appendTransportDashboardMetrics(metricMap),
    appendEnergyDashboardMetrics(metricMap),
    appendBudgetDashboardMetrics(metricMap),
    appendPaymentSystemMetrics(metricMap),
    appendExternalSectorMetrics(metricMap),
    appendLegalCodeMetrics(metricMap),
  ]);

  const metricCatalog = Array.from(metricMap.values());
  const rankedCatalog = prioritizeMetricCatalog(metricCatalog, instruction);

  const response = await openai.responses.create({
    model,
    temperature: 0.4,
    input: buildInstructionPrompt({
      instruction,
      maxPosts,
      metricCatalog: rankedCatalog,
    }),
  });

  const parsed = parsePromptJsonFromText(response.output_text ?? "");
  if (!parsed) {
    throw new Error("A IA não devolveu um JSON válido para os drafts.");
  }

  let created = 0;
  let skipped = 0;

  for (const item of parsed.posts.slice(0, maxPosts)) {
    const selectedMetricKeys = (item.metric_keys ?? []).filter((key) => metricMap.has(key));
    const selectedMetrics = selectedMetricKeys
      .map((key) => metricMap.get(key))
      .filter((metric): metric is MetricCandidate => Boolean(metric));
    const year = item.year ?? selectedMetrics[0]?.year ?? null;

    const facts: MetricFact[] = selectedMetrics.slice(0, 8).map((metric) => ({
      label: `${metric.metric} (${metric.year})`,
      value: metric.value,
      unit: metric.unit,
      context: metric.category,
    }));

    const slug = await makeUniqueSlug(blogCol, item.title);
    const now = new Date();
    const shortBodyMd = enforceShortArticleBody(item.body_md);
    try {
      await blogCol.insertOne({
        slug,
        title: item.title,
        summary: item.summary,
        bodyMd: shortBodyMd,
        heroImageUrl: null,
        heroImageAlt: null,
        metricKeys: selectedMetricKeys,
        year,
        sourceDataset: "dashboard_multi_source:prompt",
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
    created,
    skipped,
    generated: Math.min(parsed.posts.length, maxPosts),
    promptCatalogSize: rankedCatalog.length,
    availableMetrics: metricCatalog.length,
    sourceCoverage: {
      coreMetrics: true,
      tourism: true,
      transport: true,
      energy: true,
      budget: true,
      paymentSystem: true,
      externalFinance: true,
      legalCode: true,
    },
  };
}
