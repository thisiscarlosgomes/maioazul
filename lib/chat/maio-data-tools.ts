import * as z from "zod/v4";

type Query = Record<string, string | number | undefined | null>;

const MIN_YEAR = 2024;
const MAX_YEAR = 2035;

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
  get_island_comparison_snapshot: z
    .object({
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025),
      ilhas: z.array(z.string().min(1).max(64)).max(8).optional(),
    })
    .strict(),
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
    case "get_island_comparison_snapshot":
      return getIslandComparisonSnapshot(request, rawArgs);
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
