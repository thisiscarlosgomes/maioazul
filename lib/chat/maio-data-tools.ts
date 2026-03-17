import * as z from "zod/v4";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import type {
  BudgetApiResponse,
  BudgetBreakdownItem,
  BudgetProjectItem,
} from "@/lib/budget";

type Query = Record<string, string | number | undefined | null>;
type CoreMetricRow = {
  category?: string;
  metric?: string;
  value?: number;
  unit?: string;
  breakdown?: Record<string, unknown> | null;
};
type LegalChunk = {
  id: string;
  doc_id: string;
  source_pdf: string;
  page_start: number;
  page_end: number;
  title?: string | null;
  chapter?: string | null;
  section?: string | null;
  article_heading?: string | null;
  article_number?: number | null;
  part_index?: number | null;
  parts_total?: number | null;
  text: string;
};
type IndexedLegalChunk = LegalChunk & { _search: string };
type LegalCorpus = {
  paths: string[];
  chunks: IndexedLegalChunk[];
};

const MIN_YEAR = 2024;
const MAX_YEAR = 2035;
const AVAILABLE_BUDGET_YEARS = [2025, 2026] as const;
const PAYMENT_DATA_MIN_YEAR = 2019;
const PAYMENT_DATA_MAX_YEAR = 2023;
const PAYMENT_DATA_YEARS = ["2019", "2020", "2021", "2022", "2023"] as const;
const LEGAL_CHUNKS_ENV_PATH = process.env.LEGAL_CODE_CHUNKS_PATH;
let legalCorpusCache: { cacheKey: string; corpus: LegalCorpus } | null = null;

export class ToolHttpError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "ToolHttpError";
    this.status = status;
    this.body = body;
  }
}

export const toolSchemas = {
  get_tourism_overview: z
    .object({
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional(),
    })
    .strict(),
  get_tourism_indicators: z
    .object({
      ilha: z.enum(["Maio", "Sal", "Boa Vista"]).default("Maio"),
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025),
    })
    .strict(),
  get_maio_core_metrics: z
    .object({
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional(),
      category: z.string().min(1).max(64).optional(),
      metric: z.string().min(1).max(64).optional(),
      limit: z.number().int().min(1).max(200).default(100),
    })
    .strict(),
  get_tourism_quarters: z
    .object({
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025),
    })
    .strict(),
  get_tourism_population: z
    .object({
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025),
      ilha: z.string().min(1).max(64).optional(),
    })
    .strict(),
  get_transport_overview: z
    .object({
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025),
      ilha: z.string().min(1).max(64).optional(),
    })
    .strict(),
  get_payment_system_data: z
    .object({
      section: z
        .enum([
          "all",
          "banking_structure_by_island",
          "atm_terminals_by_island",
          "pos_terminals_by_island",
          "atm_population_coverage_by_municipality",
        ])
        .default("all"),
      ilha: z.string().min(1).max(64).optional(),
      year: z
        .number()
        .int()
        .min(PAYMENT_DATA_MIN_YEAR)
        .max(PAYMENT_DATA_MAX_YEAR)
        .default(PAYMENT_DATA_MAX_YEAR),
      limit: z.number().int().min(1).max(200).default(50),
      include_totals: z.boolean().default(true),
    })
    .strict(),
  get_island_comparison_snapshot: z
    .object({
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025),
      ilhas: z.array(z.string().min(1).max(64)).max(8).optional(),
    })
    .strict(),
  get_maio_budget: z
    .object({
      year: z.union([z.literal(2025), z.literal(2026)]).default(2026),
      view: z.enum(["summary", "full"]).default("summary"),
      section: z
        .enum([
          "all",
          "revenue_breakdown",
          "expense_breakdown",
          "functional_breakdown",
          "department_breakdown",
          "investment_programs",
          "investment_projects",
          "funding_sources",
          "compensation_framework",
          "staffing_positions",
          "legal_highlights",
          "fiscal_operations",
        ])
        .default("all"),
      project_limit: z.number().int().min(1).max(200).default(8),
    })
    .strict(),
  get_maio_budget_comparison: z
    .object({
      from_year: z.union([z.literal(2025), z.literal(2026)]).default(2025),
      to_year: z.union([z.literal(2025), z.literal(2026)]).default(2026),
      project_limit: z.number().int().min(1).max(20).default(5),
    })
    .strict(),
  get_maio_budget_metrics_snapshot: z
    .object({
      year: z.union([z.literal(2025), z.literal(2026)]).default(2026),
      metric_limit: z.number().int().min(3).max(20).default(8),
      project_limit: z.number().int().min(1).max(20).default(5),
    })
    .strict(),
  get_maio_compensation_lookup: z
    .object({
      year: z.union([z.literal(2025), z.literal(2026)]).default(2026),
      query: z.string().min(1).max(120),
      limit: z.number().int().min(1).max(20).default(5),
    })
    .strict(),
  get_maio_energy_core: z.object({}).strict(),
  search_codigo_postura: z
    .object({
      query: z.string().min(2).max(300),
      top_k: z.number().int().min(1).max(20).default(5),
      article_number: z.number().int().min(1).max(1000).optional(),
      doc_id: z.string().min(2).max(120).optional(),
    })
    .strict(),
  get_codigo_postura_article: z
    .object({
      article_number: z.number().int().min(1).max(1000),
      doc_id: z.string().min(2).max(120).optional(),
      max_chars: z.number().int().min(200).max(60000).default(12000),
    })
    .strict(),
  get_codigo_postura_stats: z.object({}).strict(),
};

export type MaioToolName = keyof typeof toolSchemas;

export const nativeToolDefinitions = {
  get_tourism_overview: {
    title: "Get Tourism Overview",
    description:
      "Fetches island tourism summary by quarter and totals for a year from municipal Maio tourism data.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: ["integer", "null"],
          minimum: MIN_YEAR,
          maximum: MAX_YEAR,
          description: "Reference year. Defaults to 2025 in upstream API.",
        },
      },
      required: ["year"],
      additionalProperties: false,
    },
  },
  get_tourism_indicators: {
    title: "Get Tourism Indicators",
    description:
      "Returns tourism pressure, seasonality, and local-retention proxy for an island/year using your existing indicators API.",
    parameters: {
      type: "object",
      properties: {
        ilha: {
          type: ["string", "null"],
          enum: ["Maio", "Sal", "Boa Vista"],
          description: "Island name used by the upstream API.",
        },
        year: {
          type: ["integer", "null"],
          minimum: MIN_YEAR,
          maximum: MAX_YEAR,
          description: "Reference year.",
        },
      },
      required: ["ilha", "year"],
      additionalProperties: false,
    },
  },
  get_maio_core_metrics: {
    title: "Get Maio Core Metrics",
    description: "Returns Maio municipal core metrics with optional filters and bounded row count.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: ["integer", "null"],
          minimum: MIN_YEAR,
          maximum: MAX_YEAR,
          description: "Reference year. If omitted, API returns latest year.",
        },
        category: {
          type: ["string", "null"],
          minLength: 1,
          maxLength: 64,
          description: "Category filter from maio_core_metrics.",
        },
        metric: {
          type: ["string", "null"],
          minLength: 1,
          maxLength: 64,
          description: "Metric name filter from maio_core_metrics.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 200,
          description: "Maximum number of metric rows returned to the client.",
        },
      },
      required: ["year", "category", "metric", "limit"],
      additionalProperties: false,
    },
  },
  get_tourism_quarters: {
    title: "Get Tourism Quarters",
    description: "Returns quarterly guest/night aggregates per island for a year.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: ["integer", "null"],
          minimum: MIN_YEAR,
          maximum: MAX_YEAR,
          description: "Reference year.",
        },
      },
      required: ["year"],
      additionalProperties: false,
    },
  },
  get_tourism_population: {
    title: "Get Tourism Population",
    description:
      "Returns resident population by island, including national share. Falls back to latest available year if requested year has no data.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: ["integer", "null"],
          minimum: MIN_YEAR,
          maximum: MAX_YEAR,
          description: "Reference year.",
        },
        ilha: {
          type: ["string", "null"],
          minLength: 1,
          maxLength: 64,
          description: "Optional island filter (e.g., Maio).",
        },
      },
      required: ["year", "ilha"],
      additionalProperties: false,
    },
  },
  get_transport_overview: {
    title: "Get Transport Overview",
    description:
      "Returns transportation indicators for Cabo Verde (maritime and air), including 2024-2025 comparison metrics and optional island filtering (e.g., Maio).",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: ["integer", "null"],
          minimum: MIN_YEAR,
          maximum: MAX_YEAR,
          description: "Reference year. Transport dataset currently available for 2025.",
        },
        ilha: {
          type: ["string", "null"],
          minLength: 1,
          maxLength: 64,
          description:
            "Optional island filter (e.g., Maio). If omitted, returns national rows.",
        },
      },
      required: ["year", "ilha"],
      additionalProperties: false,
    },
  },
  get_payment_system_data: {
    title: "Get Payment System Data",
    description:
      "Returns payment-system indicators for Cabo Verde (2019-2023): banking structure by island, ATM terminals, POS terminals, and ATM population coverage by municipality, with optional island filtering.",
    parameters: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: [
            "all",
            "banking_structure_by_island",
            "atm_terminals_by_island",
            "pos_terminals_by_island",
            "atm_population_coverage_by_municipality",
          ],
          description: "Dataset section to return.",
        },
        ilha: {
          type: ["string", "null"],
          minLength: 1,
          maxLength: 64,
          description:
            "Optional island filter (e.g., Maio). For municipality coverage, this matches municipality name when provided.",
        },
        year: {
          type: "integer",
          minimum: PAYMENT_DATA_MIN_YEAR,
          maximum: PAYMENT_DATA_MAX_YEAR,
          description: "Reference year used for sorting and top-line summaries.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 200,
          description: "Maximum number of rows returned per section.",
        },
        include_totals: {
          type: "boolean",
          description: "Whether to keep total rows when available.",
        },
      },
      required: ["section", "ilha", "year", "limit", "include_totals"],
      additionalProperties: false,
    },
  },
  get_island_comparison_snapshot: {
    title: "Get Island Comparison Snapshot",
    description:
      "Returns a comparable cross-island snapshot for Maio and other islands using overview, pressure, seasonality, and population data. Defaults to Maio, Sal, and Boa Vista when no islands are supplied.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: ["integer", "null"],
          minimum: MIN_YEAR,
          maximum: MAX_YEAR,
          description: "Reference year.",
        },
        ilhas: {
          type: ["array", "null"],
          description:
            "Island names to compare. If omitted, defaults to Maio, Sal, and Boa Vista.",
          items: {
            type: "string",
          },
        },
      },
      required: ["year", "ilhas"],
      additionalProperties: false,
    },
  },
  get_maio_budget: {
    title: "Get Maio Budget",
    description:
      "Returns the validated Maio municipal budget dataset for 2025 or 2026, including summaries, breakdowns, projects, funding sources, and legal/fiscal context.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: "integer",
          enum: [...AVAILABLE_BUDGET_YEARS],
          description: "Budget year currently available in the validated dataset.",
        },
        view: {
          type: "string",
          enum: ["summary", "full"],
          description:
            "Use 'summary' for main indicators and bounded project rows; use 'full' for the complete normalized dataset.",
        },
        section: {
          type: "string",
          enum: [
            "all",
            "revenue_breakdown",
            "expense_breakdown",
            "functional_breakdown",
            "department_breakdown",
            "investment_programs",
            "investment_projects",
            "funding_sources",
            "compensation_framework",
            "staffing_positions",
            "legal_highlights",
            "fiscal_operations",
          ],
          description:
            "Optional section filter. 'all' returns the full selected view; any other value narrows the response to that budget section plus core metadata.",
        },
        project_limit: {
          type: "integer",
          minimum: 1,
          maximum: 200,
          description:
            "Maximum investment project rows returned when a bounded response is used. Use a small number for concise summaries.",
        },
      },
      required: ["year", "view", "section", "project_limit"],
      additionalProperties: false,
    },
  },
  get_maio_budget_comparison: {
    title: "Compare Maio Budgets",
    description:
      "Compares two validated Maio municipal budget years and returns a concise, human-readable summary of what changed.",
    parameters: {
      type: "object",
      properties: {
        from_year: {
          type: "integer",
          enum: [...AVAILABLE_BUDGET_YEARS],
          description: "Base year for the comparison.",
        },
        to_year: {
          type: "integer",
          enum: [...AVAILABLE_BUDGET_YEARS],
          description: "Target year for the comparison.",
        },
        project_limit: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          description: "Maximum number of top projects returned for each compared year.",
        },
      },
      required: ["from_year", "to_year", "project_limit"],
      additionalProperties: false,
    },
  },
  get_maio_budget_metrics_snapshot: {
    title: "Get Maio Budget + Metrics Snapshot",
    description:
      "Returns a concise cross-dataset snapshot combining Maio municipal budget data with Maio core metrics for the same year when available, including practical non-causal cross-signals for decision support.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: "integer",
          enum: [...AVAILABLE_BUDGET_YEARS],
          description: "Reference budget year.",
        },
        metric_limit: {
          type: "integer",
          minimum: 3,
          maximum: 20,
          description: "Maximum number of key metrics included in the cross snapshot.",
        },
        project_limit: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          description: "Maximum number of top investment projects included in the snapshot.",
        },
      },
      required: ["year", "metric_limit", "project_limit"],
      additionalProperties: false,
    },
  },
  get_maio_compensation_lookup: {
    title: "Lookup Maio Compensation",
    description:
      "Returns exact compensation rows for a role/title query (for example Presidente or Vereadores), plus top compensation references. Uses 2025 staffing as fallback when 2026 lacks staffing annex details.",
    parameters: {
      type: "object",
      properties: {
        year: {
          type: "integer",
          enum: [...AVAILABLE_BUDGET_YEARS],
          description: "Reference year for the budget context.",
        },
        query: {
          type: "string",
          minLength: 1,
          maxLength: 120,
          description: "Role or position text to search in staffing rows.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          description: "Maximum number of matching staffing rows to return.",
        },
      },
      required: ["year", "query", "limit"],
      additionalProperties: false,
    },
  },
  get_maio_energy_core: {
    title: "Get Maio Energy Core",
    description:
      "Returns Maio municipal solar energy core dataset, including annual demand range, recommended working value, installed solar capacity, expected generation, and reported demand coverage share.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  search_codigo_postura: {
    title: "Search Codigo de Postura",
    description:
      "Searches the local Codigo de Postura corpus and returns ranked snippets with article and page citations.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          minLength: 2,
          maxLength: 300,
          description: "Natural-language query in Portuguese or English.",
        },
        top_k: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          description: "Maximum number of ranked results.",
        },
        article_number: {
          type: ["integer", "null"],
          minimum: 1,
          maximum: 1000,
          description: "Optional exact article number filter.",
        },
        doc_id: {
          type: ["string", "null"],
          minLength: 2,
          maxLength: 120,
          description: "Optional document id filter when multiple legal corpora are loaded.",
        },
      },
      required: ["query", "top_k", "article_number", "doc_id"],
      additionalProperties: false,
    },
  },
  get_codigo_postura_article: {
    title: "Get Codigo de Postura Article",
    description: "Returns full text for one article number with page/title/chapter citations.",
    parameters: {
      type: "object",
      properties: {
        article_number: {
          type: "integer",
          minimum: 1,
          maximum: 1000,
          description: "Exact article number to retrieve.",
        },
        doc_id: {
          type: ["string", "null"],
          minLength: 2,
          maxLength: 120,
          description: "Optional document id filter when multiple legal corpora are loaded.",
        },
        max_chars: {
          type: "integer",
          minimum: 200,
          maximum: 60000,
          description: "Maximum number of characters returned in article text.",
        },
      },
      required: ["article_number", "doc_id", "max_chars"],
      additionalProperties: false,
    },
  },
  get_codigo_postura_stats: {
    title: "Get Codigo de Postura Stats",
    description: "Returns loaded legal corpus coverage and document/article counts.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
} as const;

function normalizeNulls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeNulls(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        entry === null ? undefined : normalizeNulls(entry),
      ]),
    ) as T;
  }

  return value;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function listJsonlFilesRecursively(dirPath: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...listJsonlFilesRecursively(fullPath));
      continue;
    }
    if (entry.isFile() && extname(entry.name).toLowerCase() === ".jsonl") {
      out.push(fullPath);
    }
  }
  return out;
}

function resolveLegalChunksPaths(): string[] {
  const roots = [
    LEGAL_CHUNKS_ENV_PATH,
    resolve(process.cwd(), "data/codigo_postura/chunks.jsonl"),
    resolve(process.cwd(), "data/codigo_postura"),
    resolve(process.cwd(), "../data/codigo_postura/chunks.jsonl"),
    resolve(process.cwd(), "../data/codigo_postura"),
  ].filter((value): value is string => Boolean(value));

  const files = new Set<string>();
  for (const path of roots) {
    if (!existsSync(path)) continue;
    const stats = statSync(path);
    if (stats.isDirectory()) {
      for (const file of listJsonlFilesRecursively(path)) files.add(file);
      continue;
    }
    if (stats.isFile() && extname(path).toLowerCase() === ".jsonl") {
      files.add(path);
    }
  }

  const resolved = [...files].sort();
  if (resolved.length === 0) {
    throw new Error(
      "Legal chunks files not found. Set LEGAL_CODE_CHUNKS_PATH (file/dir) or place chunks under data/codigo_postura.",
    );
  }
  return resolved;
}

function loadLegalCorpus(): LegalCorpus {
  const paths = resolveLegalChunksPaths();
  const cacheKey = paths.join("|");
  if (legalCorpusCache && legalCorpusCache.cacheKey === cacheKey) {
    return legalCorpusCache.corpus;
  }

  const rows: IndexedLegalChunk[] = [];
  for (const path of paths) {
    const fileRows = readFileSync(path, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as LegalChunk)
      .map((row) => ({
        ...row,
        _search: normalizeSearchText(
          [row.title, row.chapter, row.section, row.article_heading, row.text]
            .filter(Boolean)
            .join(" "),
        ),
      }));
    rows.push(...fileRows);
  }

  const corpus: LegalCorpus = { paths, chunks: rows };
  legalCorpusCache = { cacheKey, corpus };
  return corpus;
}

function countOccurrences(haystack: string, needle: string) {
  if (!needle) return 0;
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count += 1;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

function articleSort(a: IndexedLegalChunk, b: IndexedLegalChunk): number {
  if (a.page_start !== b.page_start) return a.page_start - b.page_start;
  const aPart = a.part_index ?? 1;
  const bPart = b.part_index ?? 1;
  if (aPart !== bPart) return aPart - bPart;
  return a.id.localeCompare(b.id);
}

function getBaseUrl(request: Request): string {
  const envBaseUrl = process.env.DASHBOARD_BASE_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl;
  }

  return new URL(request.url).origin;
}

function buildUrl(request: Request, path: string, query?: Query): string {
  const url = new URL(path, getBaseUrl(request));

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function fetchJson(request: Request, path: string, query?: Query): Promise<unknown> {
  const url = buildUrl(request, path, query);
  const timeoutMs = Number(process.env.MCP_REQUEST_TIMEOUT_MS ?? 15000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new ToolHttpError(`Upstream request failed (${res.status})`, res.status, await res.text());
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function getTourismOverview(request: Request, rawArgs: unknown) {
  const { year } = toolSchemas.get_tourism_overview.parse(normalizeNulls(rawArgs ?? {}));
  return fetchJson(request, "/api/transparencia/municipal/maio/turism/overview", { year });
}

async function getTourismIndicators(request: Request, rawArgs: unknown) {
  const { ilha, year } = toolSchemas.get_tourism_indicators.parse(normalizeNulls(rawArgs ?? {}));
  return fetchJson(request, "/api/transparencia/municipal/maio/turism/indicators", { ilha, year });
}

async function getMaioCoreMetrics(request: Request, rawArgs: unknown) {
  const { year, category, metric, limit } = toolSchemas.get_maio_core_metrics.parse(normalizeNulls(rawArgs ?? {}));
  const payload = (await fetchJson(request, "/api/transparencia/municipal/maio/core-metrics", {
    year,
    category,
    metric,
  })) as { data?: unknown[] };

  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const bounded = rows.slice(0, limit);

  return {
    ...payload,
    data: bounded,
    limits: {
      requested_limit: limit,
      total_rows_available: rows.length,
      returned_rows: bounded.length,
    },
  };
}

async function getTourismQuarters(request: Request, rawArgs: unknown) {
  const { year } = toolSchemas.get_tourism_quarters.parse(normalizeNulls(rawArgs ?? {}));
  return fetchJson(request, "/api/transparencia/turismo/quarters", { year });
}

async function getTourismPopulation(request: Request, rawArgs: unknown) {
  const { year, ilha } = toolSchemas.get_tourism_population.parse(normalizeNulls(rawArgs ?? {}));
  return fetchJson(request, "/api/transparencia/turismo/population", { year, ilha });
}

async function getTransportOverview(request: Request, rawArgs: unknown) {
  const { year, ilha } = toolSchemas.get_transport_overview.parse(normalizeNulls(rawArgs ?? {}));
  const payload = (await fetchJson(
    request,
    "/api/transparencia/transportes/overview",
    { year },
  )) as {
    as_of_year?: number;
    dataset?: string;
    air?: {
      aircraft_by_airport_2025?: Array<{
        airport?: string;
        island?: string;
        domestic?: number;
        international?: number | null;
        total?: number;
      }>;
      passengers_by_airport_2025?: Array<{
        airport?: string;
        island?: string;
        embarked?: number;
        disembarked?: number;
        transit?: number | null;
        total?: number;
      }>;
      aircraft_totals_2025?: {
        domestic?: number;
        international?: number;
        total?: number;
      };
      totals_2025?: {
        embarked?: number;
        disembarked?: number;
        transit?: number;
        total?: number;
      };
    };
    maritime?: {
      ships_by_port_2025?: Array<{
        port?: string;
        island?: string;
        movements?: number;
      }>;
      passengers_by_port_2025?: Array<{
        port?: string;
        island?: string;
        passengers?: number;
      }>;
    };
    comparison_2024_2025?: Array<{
      mode?: string;
      metric?: string;
      value_2024?: number;
      value_2025?: number;
      variation_pct?: number | null;
    }>;
    sources?: Array<{
      id?: string;
      publisher?: string;
      title?: string;
    }>;
  };

  const islandFilter =
    typeof ilha === "string" && ilha.trim() && ilha !== "Todas as Ilhas"
      ? ilha.trim()
      : null;

  const shipsRows = Array.isArray(payload?.maritime?.ships_by_port_2025)
    ? payload.maritime.ships_by_port_2025
    : [];
  const maritimePassengerRows = Array.isArray(payload?.maritime?.passengers_by_port_2025)
    ? payload.maritime.passengers_by_port_2025
    : [];
  const aircraftRows = Array.isArray(payload?.air?.aircraft_by_airport_2025)
    ? payload.air.aircraft_by_airport_2025
    : [];
  const airportPassengerRows = Array.isArray(payload?.air?.passengers_by_airport_2025)
    ? payload.air.passengers_by_airport_2025
    : [];

  const filterByIsland = <T extends { island?: string }>(rows: T[]) =>
    islandFilter ? rows.filter((row) => row.island === islandFilter) : rows;

  const ships = filterByIsland(shipsRows);
  const maritimePassengers = filterByIsland(maritimePassengerRows);
  const aircraft = filterByIsland(aircraftRows);
  const airportPassengers = filterByIsland(airportPassengerRows);

  const shipsRankMap = new Map(
    shipsRows
      .slice()
      .sort((a, b) => Number(b.movements ?? 0) - Number(a.movements ?? 0))
      .map((row, index) => [String(row.port ?? ""), index + 1]),
  );
  const maritimePassengerRankMap = new Map(
    maritimePassengerRows
      .slice()
      .sort((a, b) => Number(b.passengers ?? 0) - Number(a.passengers ?? 0))
      .map((row, index) => [String(row.port ?? ""), index + 1]),
  );

  return {
    dataset: payload?.dataset ?? "cabo_verde_transportes_2025",
    year: payload?.as_of_year ?? year,
    island_filter: islandFilter,
    summary: {
      ships_total:
        ships.reduce((sum, row) => sum + Number(row.movements ?? 0), 0),
      maritime_passengers_total:
        maritimePassengers.reduce((sum, row) => sum + Number(row.passengers ?? 0), 0),
      aircraft_total: islandFilter
        ? aircraft.reduce((sum, row) => sum + Number(row.total ?? 0), 0)
        : Number(payload?.air?.aircraft_totals_2025?.total ?? 0),
      air_passengers_total: islandFilter
        ? airportPassengers.reduce((sum, row) => sum + Number(row.total ?? 0), 0)
        : Number(payload?.air?.totals_2025?.total ?? 0),
    },
    maritime: {
      ships_by_port_2025: ships.map((row) => ({
        ...row,
        ranking_cv: shipsRankMap.get(String(row.port ?? "")) ?? null,
      })),
      passengers_by_port_2025: maritimePassengers.map((row) => ({
        ...row,
        ranking_cv: maritimePassengerRankMap.get(String(row.port ?? "")) ?? null,
      })),
    },
    air: {
      aircraft_by_airport_2025: aircraft,
      passengers_by_airport_2025: airportPassengers,
      aircraft_totals_2025: payload?.air?.aircraft_totals_2025 ?? null,
      passenger_totals_2025: payload?.air?.totals_2025 ?? null,
    },
    comparison_2024_2025: islandFilter ? [] : payload?.comparison_2024_2025 ?? [],
    sources: payload?.sources ?? [],
  };
}

async function getPaymentSystemData(request: Request, rawArgs: unknown) {
  const { section, ilha, year, limit, include_totals } = toolSchemas.get_payment_system_data.parse(
    normalizeNulls(rawArgs ?? {}),
  );

  const payload = (await fetchJson(request, "/api/finance/datasets", {
    dataset: "payment_system_2019_2023",
  })) as {
    source?: {
      publisher?: string;
      title?: string;
      unit?: string;
    };
    banking_structure_by_island?: Array<{ name?: string; values?: Record<string, number | null> }>;
    atm_terminals_by_island?: Array<{ name?: string; values?: Record<string, number | null> }>;
    pos_terminals_by_island?: Array<{ name?: string; values?: Record<string, number | null> }>;
    atm_population_coverage_by_municipality?: Array<{ name?: string; values?: Record<string, number | null> }>;
  };

  const islandFilter =
    typeof ilha === "string" && ilha.trim() && ilha !== "Todas as Ilhas"
      ? ilha.trim()
      : null;

  type PaymentRow = { name?: string; values?: Record<string, number | null> };
  const toSectionRows = (rows: PaymentRow[]) => {
    const withName = rows.filter((row) => Boolean(row.name));
    const totalRows = withName.filter((row) => normalizeSearchText(String(row.name)) === "total");
    const baseRows = withName.filter((row) => normalizeSearchText(String(row.name)) !== "total");
    const filteredRows = islandFilter
      ? baseRows.filter(
          (row) => normalizeSearchText(String(row.name)) === normalizeSearchText(islandFilter),
        )
      : baseRows;
    const selected = [...filteredRows]
      .sort(
        (a, b) =>
          Number(b.values?.[String(year)] ?? Number.NEGATIVE_INFINITY) -
          Number(a.values?.[String(year)] ?? Number.NEGATIVE_INFINITY),
      )
      .slice(0, limit);
    const merged = include_totals ? [...selected, ...totalRows] : selected;

    return merged.map((row) => ({
      name: String(row.name),
      values: Object.fromEntries(
        PAYMENT_DATA_YEARS.map((paymentYear) => [paymentYear, row.values?.[paymentYear] ?? null]),
      ),
      year_value: row.values?.[String(year)] ?? null,
    }));
  };

  const bankingRows = toSectionRows(payload?.banking_structure_by_island ?? []);
  const atmRows = toSectionRows(payload?.atm_terminals_by_island ?? []);
  const posRows = toSectionRows(payload?.pos_terminals_by_island ?? []);
  const coverageRows = toSectionRows(payload?.atm_population_coverage_by_municipality ?? []);

  const sectionMap = {
    banking_structure_by_island: bankingRows,
    atm_terminals_by_island: atmRows,
    pos_terminals_by_island: posRows,
    atm_population_coverage_by_municipality: coverageRows,
  } as const;

  const allSections =
    section === "all"
      ? sectionMap
      : {
          [section]: sectionMap[section],
        };

  return {
    dataset: "payment_system_2019_2023",
    year,
    island_filter: islandFilter,
    section,
    limits: {
      requested_limit: limit,
      include_totals,
    },
    source: payload?.source ?? null,
    sections: allSections,
  };
}

async function getIslandComparisonSnapshot(request: Request, rawArgs: unknown) {
  const { year, ilhas } = toolSchemas.get_island_comparison_snapshot.parse(
    normalizeNulls(rawArgs ?? {}),
  );

  const requestedIslands =
    ilhas && ilhas.length > 0 ? ilhas : ["Maio", "Sal", "Boa Vista"];

  const [overview, pressure, seasonality, population] = await Promise.all([
    fetchJson(request, "/api/transparencia/turismo/overview", { year }) as Promise<{
      islands?: Array<{
        ilha?: string;
        dormidas?: number;
        hospedes?: number;
        avg_stay?: number;
        occupancy_rate?: number;
      }>;
    }>,
    fetchJson(request, "/api/transparencia/turismo/pressure", { year }) as Promise<{
      data?: Array<{
        ilha?: string;
        pressure_index?: number | null;
        dormidas?: number;
        hospedes?: number;
      }>;
    }>,
    fetchJson(request, "/api/transparencia/turismo/seasonality", { year }) as Promise<{
      data?: Array<{
        ilha?: string;
        seasonality_index?: number | null;
        q1_dormidas?: number;
        q3_dormidas?: number;
      }>;
    }>,
    fetchJson(request, "/api/transparencia/turismo/population", { year }) as Promise<{
      data?: Array<{
        ilha?: string;
        population?: number;
        population_share_national?: number | null;
      }>;
    }>,
  ]);

  const overviewMap = new Map((overview.islands ?? []).map((row) => [row.ilha, row]));
  const pressureMap = new Map((pressure.data ?? []).map((row) => [row.ilha, row]));
  const seasonalityMap = new Map((seasonality.data ?? []).map((row) => [row.ilha, row]));
  const populationMap = new Map((population.data ?? []).map((row) => [row.ilha, row]));

  const rows = requestedIslands.map((ilha) => {
    const overviewRow = overviewMap.get(ilha);
    const pressureRow = pressureMap.get(ilha);
    const seasonalityRow = seasonalityMap.get(ilha);
    const populationRow = populationMap.get(ilha);

    return {
      ilha,
      population: populationRow?.population ?? null,
      population_share_national: populationRow?.population_share_national ?? null,
      hospedes: overviewRow?.hospedes ?? pressureRow?.hospedes ?? null,
      dormidas: overviewRow?.dormidas ?? pressureRow?.dormidas ?? null,
      avg_stay: overviewRow?.avg_stay ?? null,
      occupancy_rate: overviewRow?.occupancy_rate ?? null,
      pressure_index: pressureRow?.pressure_index ?? null,
      seasonality_index: seasonalityRow?.seasonality_index ?? null,
      q1_dormidas: seasonalityRow?.q1_dormidas ?? null,
      q3_dormidas: seasonalityRow?.q3_dormidas ?? null,
      found:
        Boolean(overviewRow) ||
        Boolean(pressureRow) ||
        Boolean(seasonalityRow) ||
        Boolean(populationRow),
    };
  });

  return {
    year,
    islands_requested: requestedIslands,
    rows,
    defaults_applied: !ilhas || ilhas.length === 0,
    note:
      !ilhas || ilhas.length === 0
        ? "Default comparison set is Maio, Sal, and Boa Vista."
        : undefined,
  };
}

function buildBudgetSectionPayload(
  payload: BudgetApiResponse,
  section: z.infer<typeof toolSchemas.get_maio_budget>["section"],
  projectLimit: number,
) {
  switch (section) {
    case "revenue_breakdown":
      return payload.revenueBreakdown;
    case "expense_breakdown":
      return payload.expenseBreakdown;
    case "functional_breakdown":
      return payload.functionalBreakdown;
    case "department_breakdown":
      return payload.departmentBreakdown;
    case "investment_programs":
      return payload.investmentPrograms;
    case "investment_projects":
      return payload.investmentProjects.slice(0, projectLimit);
    case "funding_sources":
      return payload.fundingSources;
    case "compensation_framework":
      return payload.compensationFramework;
    case "staffing_positions":
      return payload.staffingPositions;
    case "legal_highlights":
      return payload.legalHighlights;
    case "fiscal_operations":
      return payload.fiscalOperations;
    case "all":
    default:
      return null;
  }
}

function formatCompactCve(value: number) {
  return `${new Intl.NumberFormat("pt-PT", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value)} CVE`;
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(2)}%` : null;
}

function takeTop<T>(items: T[], limit: number) {
  return items.slice(0, limit);
}

function normalizeLookupText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isPartialCompensationPeriod(note: string | null | undefined) {
  if (!note) return false;
  const value = normalizeLookupText(note);
  return (
    value.includes("10 dias") ||
    value.includes("2 meses") ||
    value.includes("licenca") ||
    value.includes("licenca sem vencimento") ||
    value.includes("proporcional")
  );
}

async function getBudgetWithStaffingFallback(request: Request, year: 2025 | 2026) {
  const payload = (await fetchJson(request, "/api/transparencia/municipal/maio/orcamento", {
    year,
  })) as BudgetApiResponse;
  let staffingReferenceYear: number | null = null;
  let effectivePayload = payload;

  const missingStaffingDetail =
    !payload.compensationFramework || payload.staffingPositions.length === 0;

  if (year !== 2025 && missingStaffingDetail) {
    const fallbackPayload = (await fetchJson(
      request,
      "/api/transparencia/municipal/maio/orcamento",
      {
        year: 2025,
      },
    )) as BudgetApiResponse;

    const mergedStaffingPositions =
      payload.staffingPositions.length > 0
        ? payload.staffingPositions
        : fallbackPayload.staffingPositions;
    const mergedCompensationFramework =
      payload.compensationFramework ?? fallbackPayload.compensationFramework;

    if (mergedStaffingPositions.length > 0 || mergedCompensationFramework) {
      staffingReferenceYear = 2025;
      effectivePayload = {
        ...payload,
        staffingPositions: mergedStaffingPositions,
        compensationFramework: mergedCompensationFramework,
        summary: {
          ...payload.summary,
          staffingDataAvailable:
            payload.summary.staffingDataAvailable ||
            mergedStaffingPositions.length > 0 ||
            Boolean(mergedCompensationFramework),
        },
      };
    }
  }

  return { payload: effectivePayload, staffingReferenceYear };
}

function describeBreakdownItem(
  item: BudgetBreakdownItem | null | undefined,
  prefix: string,
) {
  if (!item) return null;

  const share = formatPercent(item.sharePct);
  return share
    ? `${prefix}: ${item.label} com ${formatCompactCve(item.amountCve)} (${share}).`
    : `${prefix}: ${item.label} com ${formatCompactCve(item.amountCve)}.`;
}

function describeProjectItem(
  item: BudgetProjectItem | null | undefined,
  rank: number,
) {
  if (!item) return null;
  return `${rank}. ${item.projectName} (${item.programName}) - ${formatCompactCve(item.amountCve)}.`;
}

function buildBudgetInsights(payload: BudgetApiResponse, projectLimit: number) {
  const topRevenue = payload.revenueBreakdown[0];
  const topExpense = payload.expenseBreakdown[0];
  const topFunction = payload.functionalBreakdown[0];
  const topDepartment = payload.departmentBreakdown[0];
  const topProgram = payload.investmentPrograms[0];
  const topProjects = takeTop(payload.investmentProjects, projectLimit);
  const balanceLabel =
    payload.summary.fiscalBalanceCve > 0
      ? "saldo positivo"
      : payload.summary.fiscalBalanceCve < 0
        ? "necessidade de financiamento"
        : "orçamento equilibrado";

  const takeaways = [
    `Em ${payload.year}, o orçamento publicado totaliza ${formatCompactCve(payload.summary.totalExpenseCve)} de despesa e ${formatCompactCve(payload.summary.totalRevenueCve)} de receita.`,
    payload.summary.fiscalBalanceCve !== 0
      ? `O resultado orçamental indica ${balanceLabel} de ${formatCompactCve(Math.abs(payload.summary.fiscalBalanceCve))}.`
      : `O resultado orçamental publicado está equilibrado, sem saldo líquido.`,
    describeBreakdownItem(topRevenue, "Maior fonte de receita"),
    describeBreakdownItem(topExpense, "Maior rubrica de despesa"),
    describeBreakdownItem(topFunction, "Função pública dominante"),
    describeBreakdownItem(topDepartment, "Maior unidade orgânica"),
    topProgram
      ? `Programa de investimento com maior peso: ${topProgram.label}, com ${formatCompactCve(topProgram.amountCve)} e ${topProgram.projectCount} projetos.`
      : null,
    payload.summary.manualReviewCount > 0
      ? `Há ${payload.summary.manualReviewCount} itens marcados para revisão manual no dataset.`
      : null,
    !payload.summary.staffingDataAvailable
      ? "O anexo detalhado de pessoal não está disponível neste conjunto publicado."
      : null,
  ].filter((line): line is string => Boolean(line));

  return {
    overview:
      `Leitura rápida de ${payload.year}: ` +
      `${formatCompactCve(payload.summary.totalRevenueCve)} de receita, ` +
      `${formatCompactCve(payload.summary.totalExpenseCve)} de despesa e ` +
      `${formatPercent(payload.summary.investmentSharePct) ?? "0%"} do orçamento em investimento.`,
    takeaways,
    topItems: {
      revenue: topRevenue
        ? {
            label: topRevenue.label,
            amountCve: topRevenue.amountCve,
            sharePct: topRevenue.sharePct,
          }
        : null,
      expense: topExpense
        ? {
            label: topExpense.label,
            amountCve: topExpense.amountCve,
            sharePct: topExpense.sharePct,
          }
        : null,
      function: topFunction
        ? {
            label: topFunction.label,
            amountCve: topFunction.amountCve,
            sharePct: topFunction.sharePct,
          }
        : null,
      department: topDepartment
        ? {
            label: topDepartment.label,
            amountCve: topDepartment.amountCve,
            sharePct: topDepartment.sharePct,
          }
        : null,
      investmentProgram: topProgram ?? null,
    },
    topProjects: topProjects
      .map((project, index) => ({
        rank: index + 1,
        programName: project.programName,
        projectName: project.projectName,
        amountCve: project.amountCve,
        summary: describeProjectItem(project, index + 1),
      })),
  };
}

function buildCompactBudgetSummary(payload: BudgetApiResponse, projectLimit: number) {
  return {
    scope: payload.scope,
    dataset: payload.dataset,
    municipality: payload.municipality,
    year: payload.year,
    availableYears: payload.availableYears,
    view: "summary" as const,
    sourceDocument: payload.sourceDocument,
    decision: payload.decision,
    summary: payload.summary,
    insights: buildBudgetInsights(payload, projectLimit),
    revenueBreakdown: takeTop(payload.revenueBreakdown, 5),
    expenseBreakdown: takeTop(payload.expenseBreakdown, 5),
    functionalBreakdown: takeTop(payload.functionalBreakdown, 5),
    departmentBreakdown: takeTop(payload.departmentBreakdown, 5),
    investmentPrograms: takeTop(payload.investmentPrograms, 6),
    fundingSources: payload.fundingSources,
    investmentProjects: takeTop(payload.investmentProjects, projectLimit),
    compensationFramework: payload.compensationFramework,
    staffingPositions: payload.staffingPositions,
    fiscalOperations: payload.fiscalOperations,
    notes: payload.notes,
    limits: {
      requested_project_limit: projectLimit,
      total_projects_available: payload.investmentProjects.length,
      returned_projects: Math.min(projectLimit, payload.investmentProjects.length),
      returned_revenue_rows: Math.min(5, payload.revenueBreakdown.length),
      returned_expense_rows: Math.min(5, payload.expenseBreakdown.length),
      returned_functional_rows: Math.min(5, payload.functionalBreakdown.length),
      returned_department_rows: Math.min(5, payload.departmentBreakdown.length),
      returned_staffing_rows: payload.staffingPositions.length,
    },
  };
}

function formatDeltaCve(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCompactCve(Math.abs(value))}`;
}

function formatDeltaPercent(fromValue: number, toValue: number) {
  if (fromValue === 0) return null;
  const delta = ((toValue - fromValue) / fromValue) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)}%`;
}

function toItemMap(items: BudgetBreakdownItem[]) {
  return new Map(items.map((item) => [item.label, item]));
}

function describeTopShift(
  fromItems: BudgetBreakdownItem[],
  toItems: BudgetBreakdownItem[],
  label: string,
) {
  const fromTop = fromItems[0];
  const toTop = toItems[0];

  if (!fromTop && !toTop) return null;
  if (!fromTop || !toTop) {
    return `${label}: a composição publicada mudou e só existe topo identificado num dos anos comparados.`;
  }

  if (fromTop.label === toTop.label) {
    const delta = toTop.amountCve - fromTop.amountCve;
    return `${label}: ${toTop.label} continua na frente, com variação de ${formatDeltaCve(delta)}.`;
  }

  return `${label}: o topo mudou de ${fromTop.label} para ${toTop.label}.`;
}

function buildBudgetComparison(fromPayload: BudgetApiResponse, toPayload: BudgetApiResponse, projectLimit: number) {
  const revenueDelta = toPayload.summary.totalRevenueCve - fromPayload.summary.totalRevenueCve;
  const expenseDelta = toPayload.summary.totalExpenseCve - fromPayload.summary.totalExpenseCve;
  const investmentShareDelta =
    toPayload.summary.investmentSharePct - fromPayload.summary.investmentSharePct;
  const balanceDelta = toPayload.summary.fiscalBalanceCve - fromPayload.summary.fiscalBalanceCve;

  const fromFundingMap = new Map(
    fromPayload.fundingSources.map((source) => [source.label, source.amountCve]),
  );
  const fundingShifts = toPayload.fundingSources
    .map((source) => ({
      label: source.label,
      fromAmountCve: fromFundingMap.get(source.label) ?? 0,
      toAmountCve: source.amountCve,
      deltaCve: source.amountCve - (fromFundingMap.get(source.label) ?? 0),
    }))
    .sort((a, b) => Math.abs(b.deltaCve) - Math.abs(a.deltaCve))
    .slice(0, 4);

  const fromProgramMap = new Map(
    fromPayload.investmentPrograms.map((program) => [program.label, program.amountCve]),
  );
  const programShifts = toPayload.investmentPrograms
    .map((program) => ({
      label: program.label,
      fromAmountCve: fromProgramMap.get(program.label) ?? 0,
      toAmountCve: program.amountCve,
      deltaCve: program.amountCve - (fromProgramMap.get(program.label) ?? 0),
      projectCount: program.projectCount,
    }))
    .sort((a, b) => Math.abs(b.deltaCve) - Math.abs(a.deltaCve))
    .slice(0, 5);

  const fromProjectMap = new Map(
    fromPayload.investmentProjects.map((project) => [
      `${project.programName}::${project.projectName}`,
      project.amountCve,
    ]),
  );
  const topProjectsTo = toPayload.investmentProjects.slice(0, projectLimit).map((project) => ({
    programName: project.programName,
    projectName: project.projectName,
    amountCve: project.amountCve,
    previousAmountCve:
      fromProjectMap.get(`${project.programName}::${project.projectName}`) ?? null,
  }));

  const revenueMapFrom = toItemMap(fromPayload.revenueBreakdown);
  const expenseMapFrom = toItemMap(fromPayload.expenseBreakdown);

  return {
    scope: "municipal" as const,
    dataset: "budget_comparison" as const,
    municipality: "Maio" as const,
    years: {
      from: fromPayload.year,
      to: toPayload.year,
    },
    overview:
      `Entre ${fromPayload.year} e ${toPayload.year}, a receita mudou ${formatDeltaCve(revenueDelta)} ` +
      `e a despesa mudou ${formatDeltaCve(expenseDelta)}.`,
    takeaways: [
      `Receita total: ${formatCompactCve(fromPayload.summary.totalRevenueCve)} em ${fromPayload.year} para ${formatCompactCve(toPayload.summary.totalRevenueCve)} em ${toPayload.year} (${formatDeltaPercent(fromPayload.summary.totalRevenueCve, toPayload.summary.totalRevenueCve) ?? "n/d"}).`,
      `Despesa total: ${formatCompactCve(fromPayload.summary.totalExpenseCve)} em ${fromPayload.year} para ${formatCompactCve(toPayload.summary.totalExpenseCve)} em ${toPayload.year} (${formatDeltaPercent(fromPayload.summary.totalExpenseCve, toPayload.summary.totalExpenseCve) ?? "n/d"}).`,
      `Peso do investimento: ${fromPayload.summary.investmentSharePct.toFixed(2)}% para ${toPayload.summary.investmentSharePct.toFixed(2)}% (${investmentShareDelta >= 0 ? "+" : ""}${investmentShareDelta.toFixed(2)} p.p.).`,
      `Saldo orçamental: ${formatCompactCve(fromPayload.summary.fiscalBalanceCve)} em ${fromPayload.year} e ${formatCompactCve(toPayload.summary.fiscalBalanceCve)} em ${toPayload.year}, diferença de ${formatDeltaCve(balanceDelta)}.`,
      describeTopShift(fromPayload.functionalBreakdown, toPayload.functionalBreakdown, "Função dominante"),
      describeTopShift(fromPayload.departmentBreakdown, toPayload.departmentBreakdown, "Unidade orgânica dominante"),
    ].filter((line): line is string => Boolean(line)),
    keyChanges: {
      revenueDeltaCve: revenueDelta,
      expenseDeltaCve: expenseDelta,
      fiscalBalanceDeltaCve: balanceDelta,
      investmentShareDeltaPctPoints: Number(investmentShareDelta.toFixed(2)),
      topRevenueShift:
        toPayload.revenueBreakdown[0]
          ? {
              label: toPayload.revenueBreakdown[0].label,
              fromAmountCve: revenueMapFrom.get(toPayload.revenueBreakdown[0].label)?.amountCve ?? 0,
              toAmountCve: toPayload.revenueBreakdown[0].amountCve,
            }
          : null,
      topExpenseShift:
        toPayload.expenseBreakdown[0]
          ? {
              label: toPayload.expenseBreakdown[0].label,
              fromAmountCve: expenseMapFrom.get(toPayload.expenseBreakdown[0].label)?.amountCve ?? 0,
              toAmountCve: toPayload.expenseBreakdown[0].amountCve,
            }
          : null,
    },
    fundingShifts,
    programShifts,
    topProjectsTo,
    sources: {
      from: fromPayload.sourceDocument,
      to: toPayload.sourceDocument,
    },
  };
}

function findMetric(
  rows: CoreMetricRow[],
  category: string,
  metric: string,
) {
  return rows.find(
    (row) => row.category === category && row.metric === metric && typeof row.value === "number",
  );
}

function formatMetricValue(row: CoreMetricRow | undefined) {
  if (!row || typeof row.value !== "number") return null;
  if (row.unit === "percent") return `${row.value.toFixed(1)}%`;
  if (row.unit === "households") return `${Math.round(row.value)} agregados`;
  if (row.unit === "people") return `${row.value.toFixed(1)} pessoas`;
  return `${row.value}`;
}

function getShareByLabel(items: BudgetBreakdownItem[], regex: RegExp) {
  const target = items.find((item) => regex.test(item.label));
  return target?.sharePct ?? null;
}

function buildBudgetMetricsSignals(
  budget: BudgetApiResponse,
  metricsRows: CoreMetricRow[],
) {
  const investmentShare = budget.summary.investmentSharePct;
  const transferShare = getShareByLabel(budget.revenueBreakdown, /transfer/i);
  const personnelShare = getShareByLabel(budget.expenseBreakdown, /pessoal/i);
  const unemployment = findMetric(metricsRows, "labor", "unemployment_rate");
  const youthUnemployment = findMetric(metricsRows, "labor", "youth_unemployment_rate");
  const internet = findMetric(metricsRows, "ict", "internet_access_home");
  const water = findMetric(metricsRows, "living_conditions", "water_network_access");
  const electricity = findMetric(metricsRows, "living_conditions", "electricity_access");
  const households = findMetric(metricsRows, "households", "total_households");

  const signals = [
    `Estrutura orçamental ${budget.year}: investimento em ${investmentShare.toFixed(2)}% da despesa total e saldo de ${formatCompactCve(budget.summary.fiscalBalanceCve)}.`,
    transferShare !== null
      ? `Transferências representam ${transferShare.toFixed(2)}% da receita.`
      : null,
    personnelShare !== null
      ? `Despesas com pessoal representam ${personnelShare.toFixed(2)}% da despesa.`
      : null,
    unemployment
      ? `Mercado de trabalho (mesmo referencial anual de métricas): desemprego em ${formatMetricValue(unemployment)}.`
      : null,
    youthUnemployment
      ? `Desemprego jovem em ${formatMetricValue(youthUnemployment)}, útil para priorizar programas de qualificação e empregabilidade.`
      : null,
    internet && water && electricity
      ? `Serviços básicos e conectividade: internet ${formatMetricValue(internet)}, água em rede ${formatMetricValue(water)} e eletricidade ${formatMetricValue(electricity)}.`
      : null,
    households
      ? `Escala social de referência: ${formatMetricValue(households)}.`
      : null,
  ].filter((line): line is string => Boolean(line));

  return signals.slice(0, 6);
}

async function getMaioBudgetMetricsSnapshot(request: Request, rawArgs: unknown) {
  const { year, metric_limit, project_limit } = toolSchemas.get_maio_budget_metrics_snapshot.parse(
    normalizeNulls(rawArgs ?? {}),
  );

  const budgetPayload = (await fetchJson(request, "/api/transparencia/municipal/maio/orcamento", {
    year,
  })) as BudgetApiResponse;

  const sameYearMetrics = (await fetchJson(
    request,
    "/api/transparencia/municipal/maio/core-metrics",
    { year },
  )) as { data?: CoreMetricRow[] };

  const sameYearRows = Array.isArray(sameYearMetrics?.data) ? sameYearMetrics.data : [];
  const fallbackYear = year === 2026 ? 2025 : year;

  const fallbackMetrics =
    sameYearRows.length === 0 && fallbackYear !== year
      ? ((await fetchJson(request, "/api/transparencia/municipal/maio/core-metrics", {
          year: fallbackYear,
        })) as { data?: CoreMetricRow[] })
      : null;

  const selectedRows =
    sameYearRows.length > 0
      ? sameYearRows
      : Array.isArray(fallbackMetrics?.data)
        ? fallbackMetrics.data
        : [];

  const keyMetricPriority = [
    ["labor", "employment_rate"],
    ["labor", "unemployment_rate"],
    ["labor", "youth_unemployment_rate"],
    ["households", "total_households"],
    ["households", "average_household_size"],
    ["ict", "internet_access_home"],
    ["living_conditions", "water_network_access"],
    ["living_conditions", "electricity_access"],
    ["living_conditions", "bathroom_access"],
    ["education", "literacy_rate"],
  ] as const;

  const keyMetrics = keyMetricPriority
    .map(([category, metric]) => findMetric(selectedRows, category, metric))
    .filter((row): row is CoreMetricRow => Boolean(row))
    .slice(0, metric_limit)
    .map((row) => ({
      category: row.category ?? null,
      metric: row.metric ?? null,
      value: typeof row.value === "number" ? row.value : null,
      unit: row.unit ?? null,
      breakdown: row.breakdown ?? null,
    }));

  return {
    scope: "municipal" as const,
    dataset: "budget_metrics_snapshot" as const,
    municipality: "Maio" as const,
    requested_year: year,
    budget_year: budgetPayload.year,
    metrics_year:
      sameYearRows.length > 0
        ? year
        : selectedRows.length > 0
          ? fallbackYear
          : null,
    fallback_applied: sameYearRows.length === 0 && selectedRows.length > 0 && fallbackYear !== year,
    caveat:
      sameYearRows.length === 0 && selectedRows.length > 0 && fallbackYear !== year
        ? `Não existem core metrics publicados para ${year}; foi usado ${fallbackYear} como referencial de métricas.`
        : null,
    budget_summary: {
      total_revenue_cve: budgetPayload.summary.totalRevenueCve,
      total_expense_cve: budgetPayload.summary.totalExpenseCve,
      fiscal_balance_cve: budgetPayload.summary.fiscalBalanceCve,
      investment_share_pct: budgetPayload.summary.investmentSharePct,
    },
    top_budget_items: {
      revenue: takeTop(budgetPayload.revenueBreakdown, 4),
      expense: takeTop(budgetPayload.expenseBreakdown, 4),
      projects: takeTop(budgetPayload.investmentProjects, project_limit),
    },
    key_metrics: keyMetrics,
    cross_signals: buildBudgetMetricsSignals(budgetPayload, selectedRows),
    methodology: {
      type: "descriptive_cross_reading",
      correlation_statistical: false,
      note:
        "Leitura cruzada descritiva para suporte à decisão. Associações apresentadas não implicam causalidade estatística.",
    },
  };
}

async function getMaioBudget(request: Request, rawArgs: unknown) {
  const { year, view, section, project_limit } = toolSchemas.get_maio_budget.parse(
    normalizeNulls(rawArgs ?? {}),
  );

  const { payload: effectivePayload, staffingReferenceYear } =
    await getBudgetWithStaffingFallback(request, year);

  const boundedProjects = effectivePayload.investmentProjects.slice(0, project_limit);

  if (section !== "all") {
    const sectionPayload = buildBudgetSectionPayload(
      effectivePayload,
      section,
      project_limit,
    );

    return {
      scope: effectivePayload.scope,
      dataset: effectivePayload.dataset,
      municipality: effectivePayload.municipality,
      year: effectivePayload.year,
      availableYears: effectivePayload.availableYears,
      view,
      section,
      sourceDocument: effectivePayload.sourceDocument,
      decision: effectivePayload.decision,
      summary: effectivePayload.summary,
      insights: buildBudgetInsights(effectivePayload, Math.min(project_limit, 5)),
      staffing_reference_year: staffingReferenceYear,
      data: sectionPayload,
      limits:
        section === "investment_projects"
          ? {
              requested_project_limit: project_limit,
              total_projects_available: effectivePayload.investmentProjects.length,
              returned_projects: boundedProjects.length,
            }
          : undefined,
      notes: effectivePayload.notes,
    };
  }

  if (view === "full") {
    return {
      ...effectivePayload,
      staffing_reference_year: staffingReferenceYear,
    };
  }

  return {
    ...buildCompactBudgetSummary(effectivePayload, project_limit),
    staffing_reference_year: staffingReferenceYear,
  };
}

async function getMaioCompensationLookup(request: Request, rawArgs: unknown) {
  const { year, query, limit } = toolSchemas.get_maio_compensation_lookup.parse(
    normalizeNulls(rawArgs ?? {}),
  );
  const { payload, staffingReferenceYear } = await getBudgetWithStaffingFallback(request, year);
  const normalizedQuery = normalizeLookupText(query);
  const tokens = normalizedQuery.split(/\s+/).filter((token) => token.length > 1);

  const baseRows = payload.staffingPositions.map((row) => {
    const vacancies = row.vacancyCount > 0 ? row.vacancyCount : 1;
    return {
      position_title: row.positionTitle,
      cost_center: row.costCenterName,
      staff_group: row.staffGroup,
      vacancies: row.vacancyCount,
      monthly_total_cve: row.monthlySalaryCve,
      monthly_per_vaga_cve: Math.round(row.monthlySalaryCve / vacancies),
      annual_total_cve: row.annualSalaryCve,
      annual_per_vaga_cve: Math.round(row.annualSalaryCve / vacancies),
      is_partial_period: isPartialCompensationPeriod(row.observation),
      note: row.observation ?? null,
      source_type: "base" as const,
    };
  });

  const adjustmentRows = (payload.compensationFramework?.adjustments?.items ?? []).map((item) => {
    const vacancies = item.vacancies > 0 ? item.vacancies : 1;
    return {
      position_title: item.positionTitle,
      cost_center: item.departmentName,
      staff_group: item.employmentType,
      vacancies: item.vacancies,
      monthly_total_cve: item.monthlyCve,
      monthly_per_vaga_cve: Math.round(item.monthlyCve / vacancies),
      annual_total_cve: item.annualCve,
      annual_per_vaga_cve: Math.round(item.annualCve / vacancies),
      is_partial_period: isPartialCompensationPeriod(item.notes),
      note: item.notes ?? null,
      source_type: "adjustment" as const,
    };
  });

  const mergedRows = [...baseRows, ...adjustmentRows];
  const dedupedRows = Array.from(
    new Map(
      mergedRows.map((row) => [
        `${normalizeLookupText(row.position_title)}|${normalizeLookupText(row.cost_center)}|${row.vacancies}|${row.monthly_total_cve}|${row.annual_total_cve}`,
        row,
      ]),
    ).values(),
  );

  const rowScore = (row: (typeof dedupedRows)[number]) => {
    const position = normalizeLookupText(row.position_title);
    const group = normalizeLookupText(row.staff_group ?? "");
    const costCenter = normalizeLookupText(row.cost_center);
    const target = `${position} ${group} ${costCenter}`.trim();
    let score = 0;

    // Strongly prioritize role/title matches over department-name matches.
    if (position === normalizedQuery) score += 100;
    else if (position.startsWith(normalizedQuery)) score += 60;
    else if (position.includes(normalizedQuery)) score += 40;

    if (group === normalizedQuery) score += 24;
    else if (group.includes(normalizedQuery)) score += 12;

    if (costCenter === normalizedQuery) score += 10;
    else if (costCenter.includes(normalizedQuery)) score += 4;

    if (target.includes(normalizedQuery)) score += 2;

    for (const token of tokens) {
      if (position.includes(token)) score += 8;
      else if (group.includes(token)) score += 3;
      else if (costCenter.includes(token)) score += 1;
    }
    return score;
  };

  const matches = dedupedRows
    .map((row) => ({ row, score: rowScore(row) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.row.monthly_total_cve - a.row.monthly_total_cve;
    })
    .slice(0, limit)
    .map((entry) => entry.row);

  const topByMonthlyTotalLine = dedupedRows
    .slice()
    .sort((a, b) => b.monthly_total_cve - a.monthly_total_cve)[0];
  const topByMonthlyPerVaga = dedupedRows
    .slice()
    .sort((a, b) => {
      const aVac = a.vacancies > 0 ? a.vacancies : 1;
      const bVac = b.vacancies > 0 ? b.vacancies : 1;
      return b.monthly_total_cve / bVac - a.monthly_total_cve / aVac;
    })[0];
  const topByMonthlyPerVagaCurrent = dedupedRows
    .filter((row) => !row.is_partial_period)
    .slice()
    .sort((a, b) => {
      const aVac = a.vacancies > 0 ? a.vacancies : 1;
      const bVac = b.vacancies > 0 ? b.vacancies : 1;
      return b.monthly_total_cve / bVac - a.monthly_total_cve / aVac;
    })[0];

  return {
    scope: payload.scope,
    dataset: "budget_compensation_lookup" as const,
    municipality: payload.municipality,
    year: payload.year,
    staffing_reference_year: staffingReferenceYear,
    query,
    matches,
    canonical_rows: dedupedRows,
    top_reference: {
      by_monthly_total_line: topByMonthlyTotalLine
        ? {
            position_title: topByMonthlyTotalLine.position_title,
            monthly_total_cve: topByMonthlyTotalLine.monthly_total_cve,
            annual_total_cve: topByMonthlyTotalLine.annual_total_cve,
            vacancies: topByMonthlyTotalLine.vacancies,
            cost_center: topByMonthlyTotalLine.cost_center,
            source_type: topByMonthlyTotalLine.source_type,
            is_partial_period: topByMonthlyTotalLine.is_partial_period,
          }
        : null,
      by_monthly_per_vaga: topByMonthlyPerVaga
        ? {
            position_title: topByMonthlyPerVaga.position_title,
            monthly_per_vaga_cve: Math.round(
              topByMonthlyPerVaga.monthly_total_cve /
                (topByMonthlyPerVaga.vacancies > 0 ? topByMonthlyPerVaga.vacancies : 1),
            ),
            annual_per_vaga_cve: Math.round(
              topByMonthlyPerVaga.annual_total_cve /
                (topByMonthlyPerVaga.vacancies > 0 ? topByMonthlyPerVaga.vacancies : 1),
            ),
            vacancies: topByMonthlyPerVaga.vacancies,
            cost_center: topByMonthlyPerVaga.cost_center,
            source_type: topByMonthlyPerVaga.source_type,
            is_partial_period: topByMonthlyPerVaga.is_partial_period,
          }
        : null,
      by_monthly_per_vaga_current: topByMonthlyPerVagaCurrent
        ? {
            position_title: topByMonthlyPerVagaCurrent.position_title,
            monthly_per_vaga_cve: Math.round(
              topByMonthlyPerVagaCurrent.monthly_total_cve /
                (topByMonthlyPerVagaCurrent.vacancies > 0
                  ? topByMonthlyPerVagaCurrent.vacancies
                  : 1),
            ),
            annual_per_vaga_cve: Math.round(
              topByMonthlyPerVagaCurrent.annual_total_cve /
                (topByMonthlyPerVagaCurrent.vacancies > 0
                  ? topByMonthlyPerVagaCurrent.vacancies
                  : 1),
            ),
            vacancies: topByMonthlyPerVagaCurrent.vacancies,
            cost_center: topByMonthlyPerVagaCurrent.cost_center,
            source_type: topByMonthlyPerVagaCurrent.source_type,
            is_partial_period: topByMonthlyPerVagaCurrent.is_partial_period,
          }
        : null,
    },
    totals: {
      staffing_rows_available: dedupedRows.length,
      matches_found: matches.length,
      partial_period_rows: dedupedRows.filter((row) => row.is_partial_period).length,
    },
    methodology: {
      note:
        "Os valores por linha podem representar total agregado da linha para o número de vagas. Use monthly_per_vaga_cve para leitura individual por vaga.",
      current_ranking_excludes_partial_period_rows: true,
    },
  };
}

async function getMaioEnergyCore(request: Request, rawArgs: unknown) {
  toolSchemas.get_maio_energy_core.parse(normalizeNulls(rawArgs ?? {}));
  return fetchJson(request, "/api/transparencia/municipal/maio/energia");
}

async function getMaioBudgetComparison(request: Request, rawArgs: unknown) {
  const { from_year, to_year, project_limit } = toolSchemas.get_maio_budget_comparison.parse(
    normalizeNulls(rawArgs ?? {}),
  );

  if (from_year === to_year) {
    throw new Error("from_year and to_year must be different.");
  }

  const [fromPayload, toPayload] = (await Promise.all([
    fetchJson(request, "/api/transparencia/municipal/maio/orcamento", {
      year: from_year,
    }),
    fetchJson(request, "/api/transparencia/municipal/maio/orcamento", {
      year: to_year,
    }),
  ])) as [BudgetApiResponse, BudgetApiResponse];

  return buildBudgetComparison(fromPayload, toPayload, project_limit);
}

async function searchCodigoPostura(_request: Request, rawArgs: unknown) {
  const { query, top_k, article_number, doc_id } = toolSchemas.search_codigo_postura.parse(
    normalizeNulls(rawArgs ?? {}),
  );
  const { paths, chunks } = loadLegalCorpus();
  const queryNorm = normalizeSearchText(query);
  const queryTokens = queryNorm.split(" ").filter((token) => token.length >= 2);

  const ranked = chunks
    .filter((chunk) => (doc_id ? chunk.doc_id === doc_id : true))
    .filter((chunk) => (article_number ? chunk.article_number === article_number : true))
    .map((chunk) => {
      let score = 0;
      if (chunk._search.includes(queryNorm)) score += 8;
      for (const token of queryTokens) {
        score += countOccurrences(chunk._search, token) * 1.2;
      }
      if (!score) return null;
      return {
        score: Number(score.toFixed(3)),
        id: chunk.id,
        article_number: chunk.article_number ?? null,
        article_heading: chunk.article_heading ?? null,
        title: chunk.title ?? null,
        chapter: chunk.chapter ?? null,
        section: chunk.section ?? null,
        page_start: chunk.page_start,
        page_end: chunk.page_end,
        source_pdf: chunk.source_pdf,
        snippet: chunk.text.replace(/\s+/g, " ").trim().slice(0, 420),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.score - a.score)
    .slice(0, top_k);

  return {
    query,
    top_k,
    article_number: article_number ?? null,
    doc_id: doc_id ?? null,
    corpus_paths: paths,
    total_results: ranked.length,
    results: ranked,
  };
}

async function getCodigoPosturaArticle(_request: Request, rawArgs: unknown) {
  const { article_number, doc_id, max_chars } = toolSchemas.get_codigo_postura_article.parse(
    normalizeNulls(rawArgs ?? {}),
  );
  const { paths, chunks } = loadLegalCorpus();
  const articleChunks = chunks
    .filter((chunk) => chunk.article_number === article_number)
    .filter((chunk) => (doc_id ? chunk.doc_id === doc_id : true))
    .sort(articleSort);

  if (articleChunks.length === 0) {
    throw new Error(`Article ${article_number} not found${doc_id ? ` for doc_id=${doc_id}` : ""}.`);
  }

  const fullText = articleChunks.map((chunk) => chunk.text.trim()).join("\n\n").trim();
  const trimmed = fullText.slice(0, max_chars);
  const first = articleChunks[0];

  return {
    article_number,
    doc_id: first.doc_id,
    article_heading: first.article_heading ?? null,
    title: first.title ?? null,
    chapter: first.chapter ?? null,
    section: first.section ?? null,
    page_start: Math.min(...articleChunks.map((chunk) => chunk.page_start)),
    page_end: Math.max(...articleChunks.map((chunk) => chunk.page_end)),
    chunks_used: articleChunks.length,
    corpus_paths: paths,
    truncated: fullText.length > trimmed.length,
    char_count: trimmed.length,
    text: trimmed,
    source_pdf: first.source_pdf,
  };
}

async function getCodigoPosturaStats(_request: Request, _rawArgs: unknown) {
  const { paths, chunks } = loadLegalCorpus();
  const docs = new Map<
    string,
    {
      doc_id: string;
      source_pdf: string;
      chunk_count: number;
      article_numbers: Set<number>;
      page_start: number;
      page_end: number;
    }
  >();

  for (const chunk of chunks) {
    const existing = docs.get(chunk.doc_id) ?? {
      doc_id: chunk.doc_id,
      source_pdf: chunk.source_pdf,
      chunk_count: 0,
      article_numbers: new Set<number>(),
      page_start: Number.POSITIVE_INFINITY,
      page_end: 0,
    };
    existing.chunk_count += 1;
    if (chunk.article_number != null) existing.article_numbers.add(chunk.article_number);
    existing.page_start = Math.min(existing.page_start, chunk.page_start);
    existing.page_end = Math.max(existing.page_end, chunk.page_end);
    docs.set(chunk.doc_id, existing);
  }

  const docSummaries = [...docs.values()]
    .map((doc) => ({
      doc_id: doc.doc_id,
      source_pdf: doc.source_pdf,
      chunk_count: doc.chunk_count,
      article_count: doc.article_numbers.size,
      min_article: doc.article_numbers.size ? Math.min(...doc.article_numbers) : null,
      max_article: doc.article_numbers.size ? Math.max(...doc.article_numbers) : null,
      page_start: Number.isFinite(doc.page_start) ? doc.page_start : null,
      page_end: doc.page_end || null,
    }))
    .sort((a, b) => a.doc_id.localeCompare(b.doc_id));

  return {
    corpus_paths: paths,
    total_chunks: chunks.length,
    total_docs: docSummaries.length,
    docs: docSummaries,
  };
}

export async function executeMaioTool(request: Request, name: MaioToolName, rawArgs: unknown) {
  switch (name) {
    case "get_tourism_overview":
      return getTourismOverview(request, rawArgs);
    case "get_tourism_indicators":
      return getTourismIndicators(request, rawArgs);
    case "get_maio_core_metrics":
      return getMaioCoreMetrics(request, rawArgs);
    case "get_tourism_quarters":
      return getTourismQuarters(request, rawArgs);
    case "get_tourism_population":
      return getTourismPopulation(request, rawArgs);
    case "get_transport_overview":
      return getTransportOverview(request, rawArgs);
    case "get_payment_system_data":
      return getPaymentSystemData(request, rawArgs);
    case "get_island_comparison_snapshot":
      return getIslandComparisonSnapshot(request, rawArgs);
    case "get_maio_budget":
      return getMaioBudget(request, rawArgs);
    case "get_maio_budget_comparison":
      return getMaioBudgetComparison(request, rawArgs);
    case "get_maio_budget_metrics_snapshot":
      return getMaioBudgetMetricsSnapshot(request, rawArgs);
    case "get_maio_compensation_lookup":
      return getMaioCompensationLookup(request, rawArgs);
    case "get_maio_energy_core":
      return getMaioEnergyCore(request, rawArgs);
    case "search_codigo_postura":
      return searchCodigoPostura(request, rawArgs);
    case "get_codigo_postura_article":
      return getCodigoPosturaArticle(request, rawArgs);
    case "get_codigo_postura_stats":
      return getCodigoPosturaStats(request, rawArgs);
    default: {
      const exhaustive: never = name;
      throw new Error(`Unsupported tool: ${exhaustive}`);
    }
  }
}

export function getOpenAIFunctionTools() {
  return (Object.entries(nativeToolDefinitions) as Array<
    [MaioToolName, (typeof nativeToolDefinitions)[MaioToolName]]
  >).map(([name, def]) => ({
    type: "function" as const,
    name,
    description: def.description,
    parameters: def.parameters,
    strict: true,
  }));
}
