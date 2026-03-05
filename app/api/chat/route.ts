import { createHash } from "node:crypto";
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
  surface?: "dashboard" | "orcamento" | "mcp-guide" | "generic";
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

Sua função é ajudar os utilizadores a compreender os dados de turismo do Maio, os dados comparativos entre ilhas da plataforma Maioazul e o orçamento municipal do Maio.
Use as ferramentas disponíveis quando a pergunta depender de métricas de turismo, trimestres, indicadores, métricas centrais do Maio ou dados do orçamento municipal.

Política comparativa:
- O Maio é o foco principal.
- Quando o utilizador pedir comparação sem indicar ilhas, prefira comparar Maio com Sal e Boa Vista.
- Se o utilizador perguntar por outra ilha, responda com os dados disponíveis para essa ilha.
- Use a ferramenta de comparação entre ilhas sempre que isso ajudar.
- Quando a pergunta for sobre orçamento, prefira a ferramenta de orçamento validado em vez de inferir a partir de texto solto.
- Quando a pergunta comparar 2025 e 2026, prefira a ferramenta de comparação orçamental em vez de combinar duas leituras separadas.
- Quando a pergunta cruzar orçamento e métricas gerais do Maio, use primeiro a ferramenta de snapshot cruzado de orçamento+métricas.

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
  } else if (context.surface === "dashboard") {
    contextLines.push(
      "Contexto da interface: o utilizador está no dashboard principal de dados.",
    );
  } else if (context.surface === "mcp-guide") {
    contextLines.push(
      "Contexto da interface: o utilizador está na página do guia MCP.",
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
