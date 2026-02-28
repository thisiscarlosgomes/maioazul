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
let rateLimitCollectionPromise:
  | Promise<Awaited<ReturnType<typeof initializeRateLimitCollection>>>
  | null = null;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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

const SYSTEM_PROMPT = `
Você é o assistente do site MaioAzul.

Sua função é ajudar os utilizadores a compreender os dados de turismo do Maio e os dados comparativos entre ilhas da plataforma MaioAzul.
Use as ferramentas disponíveis quando a pergunta depender de métricas de turismo, trimestres, indicadores ou métricas centrais do Maio.

Política comparativa:
- O Maio é o foco principal.
- Quando o utilizador pedir comparação sem indicar ilhas, prefira comparar Maio com Sal e Boa Vista.
- Se o utilizador perguntar por outra ilha, responda com os dados disponíveis para essa ilha.
- Use a ferramenta de comparação entre ilhas sempre que isso ajudar.

Regras:
- Responda sempre em português.
- Seja conciso e factual.
- Prefira respostas baseadas em ferramentas, não em suposições.
- Se os dados estiverem em falta ou pouco claros, diga isso claramente.
- Não invente métricas, anos ou comparações.
- Quando útil, resuma os números em linguagem simples em vez de despejar JSON bruto.
`.trim();

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

  return "I could not generate a response.";
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
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const messages = normalizeMessages(body?.messages);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Missing messages" },
        { status: 400 },
      );
    }

    const quota = await consumeChatQueryQuota(request);
    if (!quota.allowed) {
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
      instructions: SYSTEM_PROMPT,
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

    return NextResponse.json({
      message: extractOutputText(response),
      toolEvents,
      model: DEFAULT_MODEL,
      remaining: quota.remaining,
    });
  } catch (error) {
    console.error("Chat API error", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Chat API error",
      },
      { status: 500 },
    );
  }
}
