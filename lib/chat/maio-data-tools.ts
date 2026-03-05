import * as z from "zod/v4";
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

const MIN_YEAR = 2024;
const MAX_YEAR = 2035;
const AVAILABLE_BUDGET_YEARS = [2025, 2026] as const;

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
      year: z.union([z.literal(2025), z.literal(2026)]).default(2025),
      metric_limit: z.number().int().min(3).max(20).default(8),
      project_limit: z.number().int().min(1).max(20).default(5),
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

  const payload = (await fetchJson(request, "/api/transparencia/municipal/maio/orcamento", {
    year,
  })) as BudgetApiResponse;

  const boundedProjects = payload.investmentProjects.slice(0, project_limit);

  if (section !== "all") {
    const sectionPayload = buildBudgetSectionPayload(payload, section, project_limit);

    return {
      scope: payload.scope,
      dataset: payload.dataset,
      municipality: payload.municipality,
      year: payload.year,
      availableYears: payload.availableYears,
      view,
      section,
      sourceDocument: payload.sourceDocument,
      decision: payload.decision,
      summary: payload.summary,
      insights: buildBudgetInsights(payload, Math.min(project_limit, 5)),
      data: sectionPayload,
      limits:
        section === "investment_projects"
          ? {
              requested_project_limit: project_limit,
              total_projects_available: payload.investmentProjects.length,
              returned_projects: boundedProjects.length,
            }
          : undefined,
      notes: payload.notes,
    };
  }

  if (view === "full") {
    return payload;
  }

  return buildCompactBudgetSummary(payload, project_limit);
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
    case "get_maio_budget":
      return getMaioBudget(request, rawArgs);
    case "get_maio_budget_comparison":
      return getMaioBudgetComparison(request, rawArgs);
    case "get_maio_budget_metrics_snapshot":
      return getMaioBudgetMetricsSnapshot(request, rawArgs);
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
