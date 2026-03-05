import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  executeMaioTool,
  getOpenAIFunctionTools,
  ToolHttpError,
  type MaioToolName,
} from "@/lib/chat/maio-data-tools";

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const MAX_MESSAGES = 12;
const MAX_TOOL_ROUNDS = 6;
const CHAT_QUERY_LIMIT = 10;
const CHAT_QUERY_WINDOW_MS = 24 * 60 * 60 * 1000;
const CHAT_RATE_LIMIT_COLLECTION = "chat_rate_limits";
const CHAT_USAGE_STATS_COLLECTION = "chat_usage_stats";
const CHAT_USERS_COLLECTION = "chat_users";
let rateLimitCollectionPromise:
  | Promise<Awaited<ReturnType<typeof initializeRateLimitCollection>>>
  | null = null;
let usageStatsCollectionPromise:
  | Promise<Awaited<ReturnType<typeof initializeUsageStatsCollection>>>
  | null = null;
let usersCollectionPromise:
  | Promise<Awaited<ReturnType<typeof initializeUsersCollection>>>
  | null = null;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatContext = {
  surface?: "dashboard" | "orcamento" | "mcp-guide" | "documentos" | "generic";
  year?: number | string;
};

type ToolEvent = {
  name: MaioToolName;
  arguments: Record<string, unknown>;
  ok: boolean;
};

type ChatRateLimitDoc = {
  _id: string;
  timestamps: Date[];
  updatedAt: Date;
  createdAt: Date;
  allowed?: boolean;
  count?: number;
};

type ChatUsageStatsDoc = {
  _id: string;
  kind: "global" | "daily";
  date?: string;
  updatedAt: Date;
  createdAt: Date;
  lastMessageAt: Date;
};

type ChatUserDoc = {
  _id: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  updatedAt: Date;
  createdAt: Date;
  requests_total?: number;
};

type ChatUsageKind = "success" | "rate_limited" | "error";

const SYSTEM_PROMPT = `
Você é o assistente do site Maioazul.

Sua função é ajudar os utilizadores a compreender os dados de turismo do Maio, os dados comparativos entre ilhas da plataforma Maioazul, o orçamento municipal do Maio e o Código de Postura do Município do Maio.
Use as ferramentas disponíveis quando a pergunta depender de métricas de turismo, trimestres, indicadores, métricas centrais do Maio, dados do orçamento municipal ou conteúdo do Código de Postura.

Política comparativa:
- O Maio é o foco principal.
- Quando o utilizador pedir comparação sem indicar ilhas, prefira comparar Maio com Sal e Boa Vista.
- Se o utilizador perguntar por outra ilha, responda com os dados disponíveis para essa ilha.
- Use a ferramenta de comparação entre ilhas sempre que isso ajudar.
- Quando a pergunta for sobre orçamento, prefira a ferramenta de orçamento validado em vez de inferir a partir de texto solto.
- Quando a pergunta comparar 2025 e 2026, prefira a ferramenta de comparação orçamental em vez de combinar duas leituras separadas.
- Quando a pergunta cruzar orçamento e métricas gerais do Maio, use primeiro a ferramenta de snapshot cruzado de orçamento+métricas.
- Para perguntas sobre salário/remuneração por cargo (ex.: presidente, vereadores), use a ferramenta de compensação por cargo e responda com o valor exato da linha do cargo.
- Para perguntas legais/regulatórias (ex.: licenças, obras, infrações, coimas, horários, civismo), consulta primeiro o Código de Postura com as ferramentas de pesquisa legal e cita artigo/página quando possível.

Regras:
- Responda sempre em português.
- Seja conciso e factual.
- Prefira respostas baseadas em ferramentas, não em suposições.
- Se os dados estiverem em falta ou pouco claros, diga isso claramente.
- Não invente métricas, anos ou comparações.
- Ao responder, prioriza os pontos de dados mais relevantes para a pergunta.
- Explica os números em linguagem simples e direta.
- Para respostas baseadas em dados, começa por uma leitura humana do que os números significam.
- Depois, usa no máximo 2 ou 3 pontos curtos com os números mais importantes.
- Evita listar tabelas completas, linhas em bruto ou blocos de JSON, a menos que o utilizador peça detalhe.
- Quando uma ferramenta devolver "insights" ou "takeaways", usa isso como base principal da resposta.
- Quando fizer sentido, termina com um "takeaway" curto sobre o que os dados significam na prática.
`.trim();

function normalizeChatContext(value: unknown): ChatContext | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const surface =
    candidate.surface === "dashboard" ||
    candidate.surface === "orcamento" ||
    candidate.surface === "mcp-guide" ||
    candidate.surface === "documentos" ||
    candidate.surface === "generic"
      ? candidate.surface
      : undefined;

  const year =
    typeof candidate.year === "number" || typeof candidate.year === "string"
      ? candidate.year
      : undefined;

  if (!surface && year === undefined) {
    return null;
  }

  return { surface, year };
}

function buildChatInstructions(context: ChatContext | null) {
  if (!context) {
    return SYSTEM_PROMPT;
  }

  const contextLines: string[] = [];

  if (context.surface === "orcamento") {
    contextLines.push(
      "Contexto da interface: o utilizador está na página de orçamento municipal.",
    );
    contextLines.push(
      "Prioriza respostas sobre receitas, despesas, investimento, projetos, financiamento e comparação entre 2025 e 2026.",
    );
    contextLines.push(
      "Para orçamento, privilegia sínteses executivas e interpretações curtas, não despejo de rubricas.",
    );
    contextLines.push(
      "Se a pergunta for sobre Código de Postura, regras legais, licenças, obras, coimas ou fiscalização, muda para as ferramentas legais em vez de responder só com orçamento.",
    );
  } else if (context.surface === "dashboard") {
    contextLines.push(
      "Contexto da interface: o utilizador está no dashboard principal de dados.",
    );
  } else if (context.surface === "mcp-guide") {
    contextLines.push(
      "Contexto da interface: o utilizador está na página do guia MCP.",
    );
  } else if (context.surface === "documentos") {
    contextLines.push(
      "Contexto da interface: o utilizador está na página de documentos PDF.",
    );
    contextLines.push(
      "Quando a pergunta for sobre documentos disponíveis, usa somente o catálogo real em /public/docs/manifest.json e não inventes anos/títulos.",
    );
  }

  if (context.year !== undefined && context.year !== null && `${context.year}`.trim() !== "") {
    contextLines.push(`Ano de contexto da interface: ${context.year}.`);
    contextLines.push(
      "Se a pergunta for ambígua e o ano não for dito explicitamente, usa primeiro este ano de contexto.",
    );
  }

  if (contextLines.length === 0) {
    return SYSTEM_PROMPT;
  }

  return `${SYSTEM_PROMPT}\n\nContexto adicional:\n- ${contextLines.join("\n- ")}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChatMessage>;
  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    candidate.content.trim().length > 0
  );
}

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input.filter(isChatMessage).slice(-MAX_MESSAGES);
}

function safeParseArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function extractOutputText(response: OpenAI.Responses.Response): string {
  if (response.output_text && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  for (const item of response.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text.trim().length > 0) {
        return content.text.trim();
      }
    }
  }

  return "Não consegui gerar uma resposta.";
}

function getClientAddress(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const directIp =
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("fly-client-ip");

  return directIp?.trim() || null;
}

function getClientRateLimitKey(request: Request): string {
  const clientAddress = getClientAddress(request);
  const userAgent = request.headers.get("user-agent")?.trim();
  const acceptLanguage = request.headers.get("accept-language")?.trim();

  const rawKey =
    clientAddress ||
    [userAgent, acceptLanguage].filter(Boolean).join("|") ||
    "anonymous";

  return createHash("sha256").update(rawKey).digest("hex");
}

async function initializeRateLimitCollection() {
  if (!process.env.MONGODB_URI) {
    return null;
  }

  const { default: clientPromise } = await import("@/lib/mongodb");
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "maioazul");
  const collection = db.collection<ChatRateLimitDoc>(CHAT_RATE_LIMIT_COLLECTION);

  await collection.createIndex(
    { updatedAt: 1 },
    { expireAfterSeconds: 2 * 24 * 60 * 60 },
  );

  return collection;
}

async function getRateLimitCollection() {
  if (!rateLimitCollectionPromise) {
    rateLimitCollectionPromise = initializeRateLimitCollection();
  }

  return rateLimitCollectionPromise;
}

async function initializeUsageStatsCollection() {
  if (!process.env.MONGODB_URI) {
    return null;
  }

  const { default: clientPromise } = await import("@/lib/mongodb");
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "maioazul");
  const collection = db.collection<ChatUsageStatsDoc>(CHAT_USAGE_STATS_COLLECTION);

  await collection.createIndex({ kind: 1, date: 1 }, { unique: true, sparse: true });

  return collection;
}

async function getUsageStatsCollection() {
  if (!usageStatsCollectionPromise) {
    usageStatsCollectionPromise = initializeUsageStatsCollection();
  }

  return usageStatsCollectionPromise;
}

async function initializeUsersCollection() {
  if (!process.env.MONGODB_URI) {
    return null;
  }

  const { default: clientPromise } = await import("@/lib/mongodb");
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "maioazul");
  const collection = db.collection<ChatUserDoc>(CHAT_USERS_COLLECTION);

  await collection.createIndex({ updatedAt: -1 });
  await collection.createIndex({ firstSeenAt: -1 });

  return collection;
}

async function getUsersCollection() {
  if (!usersCollectionPromise) {
    usersCollectionPromise = initializeUsersCollection();
  }

  return usersCollectionPromise;
}

function getSurfaceKey(context: ChatContext | null) {
  switch (context?.surface) {
    case "dashboard":
    case "orcamento":
    case "mcp-guide":
    case "generic":
      return context.surface;
    default:
      return "generic";
  }
}

function getUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function resolveContextBudgetYear(context: ChatContext | null) {
  const parsed = Number(context?.year);
  return parsed === 2025 || parsed === 2026 ? parsed : 2026;
}

type BudgetStaffingRow = {
  position_title?: string;
  monthly_total_cve?: number;
  annual_total_cve?: number;
  monthly_per_vaga_cve?: number;
  annual_per_vaga_cve?: number;
  vacancies?: number;
  cost_center?: string;
};

function buildRoleMatchScore(roleTarget: string, row: BudgetStaffingRow) {
  const role = normalizeText(roleTarget);
  const roleTokens = role.split(/\s+/).filter((token) => token.length > 1);
  const position = normalizeText(String(row.position_title ?? ""));
  const group = normalizeText(String((row as { staff_group?: string }).staff_group ?? ""));
  const costCenter = normalizeText(String(row.cost_center ?? ""));

  let score = 0;

  if (position === role) score += 300;
  else if (position.startsWith(role)) score += 180;
  else if (position.includes(role)) score += 120;

  if (group === role) score += 40;
  else if (group.includes(role)) score += 20;

  if (costCenter === role) score += 10;
  else if (costCenter.includes(role)) score += 5;

  if (roleTokens.length > 0) {
    const positionTokenHits = roleTokens.filter((token) => position.includes(token)).length;
    const groupTokenHits = roleTokens.filter((token) => group.includes(token)).length;
    const costCenterTokenHits = roleTokens.filter((token) => costCenter.includes(token)).length;
    score += positionTokenHits * 24;
    score += groupTokenHits * 5;
    score += costCenterTokenHits * 2;
    if (positionTokenHits === roleTokens.length) score += 40;
  }

  return score;
}

function pickBestRoleMatch(roleTarget: string, rows: BudgetStaffingRow[]) {
  return rows
    .map((row) => ({
      row,
      score: buildRoleMatchScore(roleTarget, row),
      monthly: Number(row.monthly_total_cve ?? 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.monthly - a.monthly;
    })[0]?.row;
}

type CompensationIntent =
  | { kind: "top_salary" }
  | { kind: "salary_total" }
  | { kind: "salary_by_department"; target: string }
  | { kind: "salary_by_role"; target: string };

function formatCveValue(value: number) {
  return `${new Intl.NumberFormat("pt-PT").format(value)} CVE`;
}

const COMPENSATION_QUERY_STOPWORDS = new Set([
  "qual",
  "quais",
  "quanto",
  "quantos",
  "salario",
  "salarios",
  "remuneracao",
  "remuneracoes",
  "ganha",
  "ganham",
  "atual",
  "atuais",
  "cargo",
  "cargos",
  "funcao",
  "funcoes",
  "camara",
  "municipal",
  "municipio",
  "maio",
  "todos",
  "todas",
  "total",
  "totais",
  "mais",
  "alto",
  "alta",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "e",
  "em",
  "na",
  "no",
  "nas",
  "nos",
  "para",
  "por",
  "o",
  "a",
  "os",
  "as",
]);

function extractCompensationRoleQuery(normalizedMessage: string) {
  const tokens = normalizedMessage
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !COMPENSATION_QUERY_STOPWORDS.has(token));

  return tokens.join(" ").trim();
}

function detectCompensationIntent(normalizedMessage: string): CompensationIntent | null {
  const hasCompensationTerm =
    normalizedMessage.includes("salario") ||
    normalizedMessage.includes("remuneracao") ||
    normalizedMessage.includes("compensacao") ||
    normalizedMessage.includes("vencimento") ||
    normalizedMessage.includes("ordenado") ||
    normalizedMessage.includes("ganha");

  if (!hasCompensationTerm) return null;

  if (
    normalizedMessage.includes("quem ganha mais") ||
    normalizedMessage.includes("quem recebe mais") ||
    normalizedMessage.includes("maior salario") ||
    normalizedMessage.includes("salario mais alto") ||
    normalizedMessage.includes("salario mais elevado") ||
    normalizedMessage.includes("remuneracao mais alta") ||
    normalizedMessage.includes("vencimento mais alto") ||
    normalizedMessage.includes("mais alto da camara") ||
    normalizedMessage.includes("mais alta da camara") ||
    normalizedMessage.includes("mais alto na camara") ||
    normalizedMessage.includes("mais alta na camara")
  ) {
    return { kind: "top_salary" };
  }

  if (
    normalizedMessage.includes("salario total") ||
    normalizedMessage.includes("compensacao total") ||
    normalizedMessage.includes("total da camara") ||
    normalizedMessage.includes("massa salarial")
  ) {
    return { kind: "salary_total" };
  }

  const departmentTarget = (() => {
    const candidates = [
      "gabinete do presidente",
      "assembleia municipal",
      "direcao de administracao, financas e patrimonio",
      "direcao de desenvolvimento economico e social",
      "direcao de ambiente, saneamento e protecao civil",
      "direcao de urbanismo, infraestruturas e transporte",
      "direcao de fiscalizacao",
    ];
    return candidates.find((candidate) => normalizedMessage.includes(candidate)) ?? null;
  })();
  if (departmentTarget) {
    return { kind: "salary_by_department", target: departmentTarget };
  }

  const roleTarget = extractCompensationRoleQuery(normalizedMessage);
  if (!roleTarget) return null;
  return { kind: "salary_by_role", target: roleTarget };
}

type PublicDocEntry = {
  fileName: string;
  displayName: string;
  title?: string;
};

type DocsManifestValue = string | { title?: string; name?: string };

async function loadPublicDocsCatalog(): Promise<PublicDocEntry[]> {
  const manifestPath = path.join(process.cwd(), "public", "docs", "manifest.json");
  const raw = await readFile(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, DocsManifestValue>;

  const entries = Object.entries(parsed)
    .filter(([fileName]) => fileName.toLowerCase().endsWith(".pdf"))
    .map(([fileName, value]) => {
      const displayName =
        (typeof value === "string" ? undefined : value?.name)?.trim() ||
        fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
      const title = (typeof value === "string" ? value : value?.title)?.trim();
      return {
        fileName,
        displayName,
        title: title && title !== displayName ? title : undefined,
      };
    });

  return entries.sort((a, b) => a.displayName.localeCompare(b.displayName, "pt"));
}

async function tryResolveDocumentsAnswer(params: {
  messages: ChatMessage[];
  context: ChatContext | null;
}) {
  const latestUserMessage = [...params.messages]
    .reverse()
    .find((item) => item.role === "user")?.content;

  if (!latestUserMessage) return null;
  const query = normalizeText(latestUserMessage);

  const asksForDocs =
    query.includes("documento") ||
    query.includes("documentos") ||
    query.includes("pdf") ||
    query.includes("boletim");
  const asksForSummary =
    query.includes("resum") ||
    query.includes("explica") ||
    query.includes("para que serve") ||
    query.includes("quais sao");

  if (!asksForDocs) return null;
  if (params.context?.surface !== "documentos" && !asksForSummary) return null;

  let docs: PublicDocEntry[] = [];
  try {
    docs = await loadPublicDocsCatalog();
  } catch {
    return null;
  }
  if (!docs.length) return null;

  const lines = docs.map((doc, idx) => {
    const titlePart = doc.title ? ` — ${doc.title}` : "";
    return `${idx + 1}. ${doc.displayName}${titlePart}`;
  });

  return {
    message:
      `Documentos disponíveis no portal:\n\n${lines.join("\n")}\n\n` +
      "Nota: o orçamento municipal publicado é o de 2026 (BO n.º 34, 23/02/2026).",
    toolEvents: [] as ToolEvent[],
  };
}

async function tryResolveCompensationAnswer(params: {
  request: Request;
  messages: ChatMessage[];
  context: ChatContext | null;
}) {
  const latestUserMessage = [...params.messages]
    .reverse()
    .find((item) => item.role === "user")?.content;

  if (!latestUserMessage) return null;

  const query = normalizeText(latestUserMessage);
  const intent = detectCompensationIntent(query);
  if (!intent) return null;

  if (intent.kind === "salary_total") {
    const budgetResult = (await executeMaioTool(
      params.request,
      "get_maio_budget",
      {
        year: resolveContextBudgetYear(params.context),
        view: "summary",
        section: "compensation_framework",
        project_limit: 8,
      },
    )) as {
      data?: {
        combined?: { totalMonthlyCve?: number; totalAnnualCve?: number; totalVacancies?: number };
      } | null;
      staffing_reference_year?: number | null;
      year?: number;
    };

    const combined = budgetResult?.data?.combined;
    if (!combined) return null;

    const referenceYear = budgetResult.staffing_reference_year ?? budgetResult.year ?? null;
    const yearNote = typeof referenceYear === "number" ? ` (referência ${referenceYear})` : "";

    return {
      message:
        `A compensação total do quadro de pessoal é ${formatCveValue(
          combined.totalMonthlyCve ?? 0,
        )} por mês e ${formatCveValue(combined.totalAnnualCve ?? 0)} por ano${yearNote}, ` +
        `para ${new Intl.NumberFormat("pt-PT").format(combined.totalVacancies ?? 0)} vagas.`,
      toolEvents: [
        {
          name: "get_maio_budget" as MaioToolName,
          arguments: {
            year: resolveContextBudgetYear(params.context),
            view: "summary",
            section: "compensation_framework",
            project_limit: 8,
          },
          ok: true,
        },
      ] satisfies ToolEvent[],
    };
  }

  if (intent.kind === "top_salary") {
    const topResult = (await executeMaioTool(
      params.request,
      "get_maio_compensation_lookup",
      {
        year: resolveContextBudgetYear(params.context),
        query: "todos",
        limit: 1,
      },
    ).catch(() => null)) as
      | {
          staffing_reference_year?: number | null;
          top_reference?: {
            by_monthly_total_line?: {
              position_title?: string;
              monthly_total_cve?: number;
            } | null;
            by_monthly_per_vaga?: {
              position_title?: string;
              monthly_per_vaga_cve?: number;
            } | null;
            by_monthly_per_vaga_current?: {
              position_title?: string;
              monthly_per_vaga_cve?: number;
            } | null;
          };
        }
      | null;
    const topTotal = topResult?.top_reference?.by_monthly_total_line;
    const topPerVaga =
      topResult?.top_reference?.by_monthly_per_vaga_current ??
      topResult?.top_reference?.by_monthly_per_vaga;
    if (!topPerVaga?.position_title || typeof topPerVaga.monthly_per_vaga_cve !== "number")
      return null;
    const groupReferenceYear = topResult?.staffing_reference_year ?? null;
    const groupYearNote = typeof groupReferenceYear === "number" ? ` (referência ${groupReferenceYear})` : "";

    const message =
      `Pelo critério individual (por vaga), o salário mensal mais alto é ${formatCveValue(
        topPerVaga.monthly_per_vaga_cve,
      )} para ${topPerVaga.position_title}${groupYearNote}.` +
      (topTotal?.position_title && typeof topTotal.monthly_total_cve === "number"
        ? ` Nota: por linha agregada (soma de múltiplas vagas), o maior total mensal é ${formatCveValue(
            topTotal.monthly_total_cve,
          )} para ${topTotal.position_title}.`
        : "");

    return {
      message,
      toolEvents: [
        {
          name: "get_maio_compensation_lookup" as MaioToolName,
          arguments: {
            year: resolveContextBudgetYear(params.context),
            query: "todos",
            limit: 1,
          },
          ok: true,
        },
      ] satisfies ToolEvent[],
    };
  }

  if (intent.kind === "salary_by_department") {
    const budgetResult = (await executeMaioTool(
      params.request,
      "get_maio_budget",
      {
        year: resolveContextBudgetYear(params.context),
        view: "summary",
        section: "compensation_framework",
        project_limit: 8,
      },
    )) as {
      data?: {
        base?: { departments?: Array<{ departmentName?: string; vacancies?: number; monthlyCve?: number; annualCve?: number }> } | null;
        adjustments?: { departments?: Array<{ departmentName?: string; vacancies?: number; monthlyCve?: number; annualCve?: number }> } | null;
      } | null;
      staffing_reference_year?: number | null;
      year?: number;
    };

    const merged = new Map<string, { departmentName: string; vacancies: number; monthlyCve: number; annualCve: number }>();
    const pushRows = (rows?: Array<{ departmentName?: string; vacancies?: number; monthlyCve?: number; annualCve?: number }>) => {
      for (const row of rows ?? []) {
        const name = String(row.departmentName ?? "").trim();
        if (!name) continue;
        const key = normalizeText(name);
        const current = merged.get(key) ?? { departmentName: name, vacancies: 0, monthlyCve: 0, annualCve: 0 };
        current.vacancies += Number(row.vacancies ?? 0);
        current.monthlyCve += Number(row.monthlyCve ?? 0);
        current.annualCve += Number(row.annualCve ?? 0);
        merged.set(key, current);
      }
    };
    pushRows(budgetResult?.data?.base?.departments);
    pushRows(budgetResult?.data?.adjustments?.departments);

    const target = Array.from(merged.values()).find((row) =>
      normalizeText(row.departmentName).includes(intent.target),
    );
    if (!target) return null;

    const referenceYear = budgetResult.staffing_reference_year ?? budgetResult.year ?? null;
    const yearNote = typeof referenceYear === "number" ? ` (referência ${referenceYear})` : "";

    return {
      message:
        `${target.departmentName}: total mensal de ${formatCveValue(
          target.monthlyCve,
        )}, total anual de ${formatCveValue(target.annualCve)} e ${new Intl.NumberFormat(
          "pt-PT",
        ).format(target.vacancies)} vagas${yearNote}.`,
      toolEvents: [
        {
          name: "get_maio_budget" as MaioToolName,
          arguments: {
            year: resolveContextBudgetYear(params.context),
            view: "summary",
            section: "compensation_framework",
            project_limit: 8,
          },
          ok: true,
        },
      ] satisfies ToolEvent[],
    };
  }

  if (intent.kind !== "salary_by_role") return null;
  const roleQuery = intent.target;

  let rawResult = (await executeMaioTool(
    params.request,
    "get_maio_compensation_lookup",
    {
      year: resolveContextBudgetYear(params.context),
      query: roleQuery,
      limit: 20,
    },
  )) as {
    matches?: BudgetStaffingRow[];
    canonical_rows?: BudgetStaffingRow[];
    staffing_reference_year?: number | null;
  };

  let rows = Array.isArray(rawResult?.matches) ? rawResult.matches : [];
  const canonicalRows = Array.isArray(rawResult?.canonical_rows) ? rawResult.canonical_rows : [];

  // Retry with singularized token form for plural queries (e.g., "vereadores" -> "vereador").
  if (rows.length === 0 && /\w+s\b/.test(roleQuery)) {
    const singularQuery = roleQuery
      .split(/\s+/)
      .map((token) => (token.endsWith("s") ? token.slice(0, -1) : token))
      .join(" ")
      .trim();

    if (singularQuery && singularQuery !== roleQuery) {
      rawResult = (await executeMaioTool(
        params.request,
        "get_maio_compensation_lookup",
        {
          year: resolveContextBudgetYear(params.context),
          query: singularQuery,
          limit: 20,
        },
      )) as {
        matches?: BudgetStaffingRow[];
        canonical_rows?: BudgetStaffingRow[];
        staffing_reference_year?: number | null;
      };
      rows = Array.isArray(rawResult?.matches) ? rawResult.matches : [];
    }
  }

  const rankedPool =
    canonicalRows.length > 0
      ? canonicalRows
      : rows;
  const target = pickBestRoleMatch(roleQuery, rankedPool) ?? rows[0];
  if (!target || typeof target.monthly_total_cve !== "number") return null;

  const referenceYear = rawResult.staffing_reference_year ?? null;
  const yearNote =
    typeof referenceYear === "number"
      ? ` (referência ${referenceYear})`
      : "";
  const vacancies = typeof target.vacancies === "number" ? target.vacancies : 0;
  const perVaga =
    typeof target.monthly_per_vaga_cve === "number"
      ? target.monthly_per_vaga_cve
      : target.monthly_total_cve;
  const annualTotal =
    typeof target.annual_total_cve === "number" ? target.annual_total_cve : 0;

  const message = vacancies > 1
    ? `Para ${target.position_title}, o total mensal é ${formatCveValue(
        target.monthly_total_cve,
      )} para ${vacancies} vagas (média de ${formatCveValue(
        perVaga,
      )} por vaga), com anual total de ${formatCveValue(annualTotal)}${yearNote}.`
    : `Para ${target.position_title}, o salário mensal é ${formatCveValue(
        target.monthly_total_cve,
      )} e o anual é ${formatCveValue(annualTotal)}${yearNote}.`;

  return {
    message,
    toolEvents: [
      {
        name: "get_maio_compensation_lookup" as MaioToolName,
        arguments: {
          year: resolveContextBudgetYear(params.context),
          query: roleQuery,
          limit: 20,
        },
        ok: true,
      },
    ] satisfies ToolEvent[],
  };
}

async function trackChatUser(request: Request, context: ChatContext | null) {
  const collection = await getUsersCollection();
  if (!collection) return;

  const now = new Date();
  const userKey = getClientRateLimitKey(request);
  const surface = getSurfaceKey(context);

  await collection.updateOne(
    { _id: userKey },
    {
      $set: {
        lastSeenAt: now,
        updatedAt: now,
      },
      $setOnInsert: {
        firstSeenAt: now,
        createdAt: now,
      },
      $inc: {
        requests_total: 1,
        [`by_surface.${surface}.requests_total`]: 1,
      },
    },
    { upsert: true },
  );
}

async function trackChatUsage(params: {
  kind: ChatUsageKind;
  context: ChatContext | null;
  toolCallCount?: number;
}) {
  const collection = await getUsageStatsCollection();
  if (!collection) return;

  const now = new Date();
  const surface = getSurfaceKey(params.context);
  const dateKey = getUtcDateKey(now);
  const isSuccess = params.kind === "success";
  const isRateLimited = params.kind === "rate_limited";
  const isError = params.kind === "error";
  const toolCalls = params.toolCallCount ?? 0;

  const increment = {
    requests_total: 1,
    successful_requests_total: isSuccess ? 1 : 0,
    rate_limited_requests_total: isRateLimited ? 1 : 0,
    failed_requests_total: isError ? 1 : 0,
    user_messages_total: isSuccess ? 1 : 0,
    assistant_messages_total: isSuccess ? 1 : 0,
    tool_calls_total: toolCalls,
    [`by_surface.${surface}.requests_total`]: 1,
    [`by_surface.${surface}.successful_requests_total`]: isSuccess ? 1 : 0,
    [`by_surface.${surface}.rate_limited_requests_total`]: isRateLimited ? 1 : 0,
    [`by_surface.${surface}.failed_requests_total`]: isError ? 1 : 0,
    [`by_surface.${surface}.user_messages_total`]: isSuccess ? 1 : 0,
    [`by_surface.${surface}.assistant_messages_total`]: isSuccess ? 1 : 0,
    [`by_surface.${surface}.tool_calls_total`]: toolCalls,
  };

  await Promise.all([
    collection.updateOne(
      { _id: "global" },
      {
        $set: {
          kind: "global",
          updatedAt: now,
          lastMessageAt: now,
        },
        $inc: increment,
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    ),
    collection.updateOne(
      { _id: `day:${dateKey}` },
      {
        $set: {
          kind: "daily",
          date: dateKey,
          updatedAt: now,
          lastMessageAt: now,
        },
        $inc: increment,
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    ),
  ]);
}

async function consumeChatQueryQuota(request: Request) {
  const collection = await getRateLimitCollection();
  if (!collection) {
    return { allowed: true as const, remaining: null };
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - CHAT_QUERY_WINDOW_MS);
  const key = getClientRateLimitKey(request);

  const result = await collection.findOneAndUpdate(
    { _id: key },
    [
      {
        $set: {
          timestamps: {
            $filter: {
              input: { $ifNull: ["$timestamps", []] },
              as: "timestamp",
              cond: { $gte: ["$$timestamp", cutoff] },
            },
          },
        },
      },
      {
        $set: {
          allowed: { $lt: [{ $size: "$timestamps" }, CHAT_QUERY_LIMIT] },
        },
      },
      {
        $set: {
          timestamps: {
            $cond: [
              "$allowed",
              { $concatArrays: ["$timestamps", [now]] },
              "$timestamps",
            ],
          },
          updatedAt: now,
          createdAt: { $ifNull: ["$createdAt", now] },
        },
      },
      {
        $set: {
          count: { $size: "$timestamps" },
        },
      },
    ],
    {
      upsert: true,
      returnDocument: "after",
    },
  );

  const doc = result as ChatRateLimitDoc | null;
  const currentCount = doc?.count ?? 0;
  const remaining = Math.max(0, CHAT_QUERY_LIMIT - currentCount);
  const oldestTimestamp = doc?.timestamps?.[0];
  const resetAt =
    currentCount >= CHAT_QUERY_LIMIT && oldestTimestamp
      ? new Date(new Date(oldestTimestamp).getTime() + CHAT_QUERY_WINDOW_MS).toISOString()
      : null;

  return {
    allowed: Boolean(doc?.allowed),
    remaining,
    resetAt,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  let requestContext: ChatContext | null = null;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const messages = normalizeMessages(body?.messages);
    const context = normalizeChatContext(body?.context);
    requestContext = context;

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Missing messages" },
        { status: 400 },
      );
    }

    try {
      await trackChatUser(request, context);
    } catch (error) {
      console.error("[Chat User Tracking]", error);
    }

    const quota = await consumeChatQueryQuota(request);
    if (!quota.allowed) {
      await trackChatUsage({
        kind: "rate_limited",
        context,
      });

      return NextResponse.json(
        {
          error: "Daily chat limit reached. You can send up to 10 messages every 24 hours.",
          limit: CHAT_QUERY_LIMIT,
          windowHours: 24,
          remaining: quota.remaining,
          resetAt: quota.resetAt,
        },
        { status: 429 },
      );
    }

    const directSalaryAnswer = await tryResolveCompensationAnswer({
      request,
      messages,
      context,
    });

    const directDocumentsAnswer = await tryResolveDocumentsAnswer({
      messages,
      context,
    });
    if (directDocumentsAnswer) {
      await trackChatUsage({
        kind: "success",
        context,
        toolCallCount: directDocumentsAnswer.toolEvents.length,
      });

      return NextResponse.json({
        message: directDocumentsAnswer.message,
        toolEvents: directDocumentsAnswer.toolEvents,
        model: "direct-documents-resolver",
        remaining: quota.remaining,
      });
    }

    if (directSalaryAnswer) {
      await trackChatUsage({
        kind: "success",
        context,
        toolCallCount: directSalaryAnswer.toolEvents.length,
      });

      return NextResponse.json({
        message: directSalaryAnswer.message,
        toolEvents: directSalaryAnswer.toolEvents,
        model: "direct-budget-resolver",
        remaining: quota.remaining,
      });
    }

    const client = new OpenAI({ apiKey });
    const tools = getOpenAIFunctionTools();
    const toolEvents: ToolEvent[] = [];

    let response = await client.responses.create({
      model: DEFAULT_MODEL,
      instructions: buildChatInstructions(context),
      input: messages,
      tools,
      parallel_tool_calls: true,
    });

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const toolCalls = (response.output ?? []).filter(
        (
          item,
        ): item is {
          type: "function_call";
          name: string;
          arguments: string;
          call_id: string;
        } => item.type === "function_call",
      );

      if (toolCalls.length === 0) {
        break;
      }

      const outputs = await Promise.all(
        toolCalls.map(async (call) => {
          const args = safeParseArguments(call.arguments);

          try {
            const result = await executeMaioTool(request, call.name as MaioToolName, args);
            toolEvents.push({
              name: call.name as MaioToolName,
              arguments: args,
              ok: true,
            });

            return {
              type: "function_call_output" as const,
              call_id: call.call_id,
              output: JSON.stringify(result),
            };
          } catch (error) {
            const serializedError =
              error instanceof ToolHttpError
                ? {
                    type: "upstream_http_error",
                    status: error.status,
                    message: error.message,
                    body: error.body.slice(0, 1000),
                  }
                : {
                    type: "internal_error",
                    message: error instanceof Error ? error.message : "Unknown error",
                  };

            toolEvents.push({
              name: call.name as MaioToolName,
              arguments: args,
              ok: false,
            });

            return {
              type: "function_call_output" as const,
              call_id: call.call_id,
              output: JSON.stringify({ error: serializedError }),
            };
          }
        }),
      );

      response = await client.responses.create({
        model: DEFAULT_MODEL,
        previous_response_id: response.id,
        input: outputs,
        tools,
        parallel_tool_calls: true,
      });
    }

    await trackChatUsage({
      kind: "success",
      context,
      toolCallCount: toolEvents.length,
    });

    return NextResponse.json({
      message: extractOutputText(response),
      toolEvents,
      model: DEFAULT_MODEL,
      remaining: quota.remaining,
    });
  } catch (error) {
    console.error("Chat API error", error);
    await trackChatUsage({
      kind: "error",
      context: requestContext,
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Chat API error",
      },
      { status: 500 },
    );
  }
}
