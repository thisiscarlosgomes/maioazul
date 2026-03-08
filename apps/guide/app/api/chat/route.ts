import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  executeGuideTool,
  openAIFunctionTools,
  ToolHttpError,
  type GuideToolName,
} from "@/lib/chat/guide-data-tools";

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4";
const MAX_MESSAGES = 12;
const MAX_TOOL_ROUNDS = 6;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatContext = {
  surface?:
    | "guide"
    | "map"
    | "places"
    | "experiences"
    | "favorites"
    | "mcp-guide"
    | "generic";
};

type ToolEvent = {
  name: GuideToolName;
  arguments: Record<string, unknown>;
  ok: boolean;
  placeCards?: Array<{
    id: string;
    name: string;
    location?: string;
    imageUrl?: string;
  }>;
  weatherCard?: {
    location: string;
    temperature?: number;
    humidity?: number;
    precipitation?: number;
    weatherCode?: number;
    updatedAt?: string;
  };
  surfCard?: {
    location: string;
    updatedAt?: string;
    points: Array<{
      label: string;
      surfMinM?: number;
      surfMaxM?: number;
      windKph?: number;
      swellPeriodS?: number;
    }>;
  };
};

const SYSTEM_PROMPT = `
You are the Visit Maio assistant.

Your job is to help travelers discover Maio island with practical, accurate guidance.
Use tools whenever the user asks about places, weather, wind/surf, boat/flight schedules, and tourism indicators.

Rules:
- Default to Portuguese. If the user clearly writes in English, reply in English.
- Be concise and practical.
- Do not invent schedules, weather values, or place facts.
- For weather, wind, surf, ferry, and flight questions, always call tools before answering.
- For place recommendations, call get_places and explain that suggestions are based on available dataset fields.
- When a tool returns uncertain, missing, or fallback data, state that clearly.
- If schedule data includes fallback=true, explicitly say it may be estimated and ask user to confirm with operator.
- Include relevant freshness markers when available (for example: updated_at).
- Prefer short summaries plus a few key bullets.
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

function normalizeContext(input: unknown): ChatContext | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Record<string, unknown>;
  const surface =
    candidate.surface === "guide" ||
    candidate.surface === "map" ||
    candidate.surface === "places" ||
    candidate.surface === "experiences" ||
    candidate.surface === "favorites" ||
    candidate.surface === "mcp-guide" ||
    candidate.surface === "generic"
      ? candidate.surface
      : undefined;

  return surface ? { surface } : null;
}

function buildInstructions(context: ChatContext | null) {
  if (!context?.surface) return SYSTEM_PROMPT;
  const lines = [`User is on the ${context.surface} page.`];

  if (context.surface === "mcp-guide") {
    lines.push("When user asks MCP setup questions, provide concrete endpoint and concise steps.");
    lines.push("For MCP examples, prefer tools that show places, weather, schedules, and tourism data.");
  }

  return `${SYSTEM_PROMPT}\n\nAdditional context:\n- ${lines.join("\n- ")}`;
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

function pickText(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const candidate = value as { en?: string; pt?: string };
    return candidate.pt ?? candidate.en ?? "";
  }
  return "";
}

function buildPlaceCardsFromToolPayload(name: GuideToolName, payload: unknown) {
  const mapPlace = (entry: Record<string, unknown>) => {
    const id = typeof entry.id === "string" ? entry.id : "";
    if (!id) return null;
    const nameText = pickText(entry.name);
    const locationText = pickText(entry.location);
    const imageUrl = typeof entry.image_url === "string" ? entry.image_url : undefined;
    return {
      id,
      name: nameText || id,
      location: locationText || undefined,
      imageUrl,
    };
  };

  if (name === "get_places") {
    const items = Array.isArray((payload as { items?: unknown[] })?.items)
      ? ((payload as { items: unknown[] }).items as unknown[])
      : [];
    return items
      .map((item) =>
        item && typeof item === "object" ? mapPlace(item as Record<string, unknown>) : null,
      )
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 6);
  }

  if (name === "get_place_detail" && payload && typeof payload === "object") {
    const card = mapPlace(payload as Record<string, unknown>);
    return card ? [card] : [];
  }

  return [];
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function buildWeatherCardFromToolPayload(name: GuideToolName, payload: unknown) {
  if (name !== "get_maio_weather" || !payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  return {
    location: typeof data.location === "string" ? data.location : "Maio",
    temperature: asNumber(data.temperature),
    humidity: asNumber(data.humidity),
    precipitation: asNumber(data.precipitation),
    weatherCode: asNumber(data.weather_code),
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : undefined,
  };
}

function buildSurfCardFromToolPayload(name: GuideToolName, payload: unknown) {
  if (name !== "get_maio_surf" || !payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const rawPoints = Array.isArray(data.points) ? (data.points as unknown[]) : [];

  const points = rawPoints
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const point = entry as Record<string, unknown>;
      return {
        label: typeof point.label === "string" ? point.label : "slot",
        surfMinM: asNumber(point.surf_min_m),
        surfMaxM: asNumber(point.surf_max_m),
        windKph: asNumber(point.wind_kph),
        swellPeriodS: asNumber(point.swell_period_s),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .slice(0, 3);

  if (points.length === 0) return null;

  return {
    location: typeof data.location === "string" ? data.location : "Maio",
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : undefined,
    points,
  };
}

function readAssistantText(message: {
  content?: string | Array<{ type?: string; text?: string }> | null;
}) {
  const content = message.content;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text" && typeof part.text === "string") return part.text;
      return "";
    })
    .join("\n")
    .trim();
}

async function requestFinalAnswer(
  client: OpenAI,
  conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
) {
  const completion = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      ...conversation,
      {
        role: "system",
        content:
          "Use only existing conversation and tool outputs to answer now. Do not call more tools.",
      },
    ],
    tools: openAIFunctionTools,
    tool_choice: "none",
  });

  return readAssistantText(completion.choices[0]?.message ?? {});
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const messages = normalizeMessages(body?.messages);
    const context = normalizeContext(body?.context);

    if (messages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const toolEvents: ToolEvent[] = [];

    const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: buildInstructions(context),
      },
      ...messages,
    ];

    let lastToolSignature = "";
    let repeatedToolRounds = 0;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const completion = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: conversation,
        tools: openAIFunctionTools,
        tool_choice: "auto",
      });

      const assistant = completion.choices[0]?.message;
      if (!assistant) {
        break;
      }

      const toolCalls = assistant.tool_calls ?? [];
      if (toolCalls.length === 0) {
        const text = readAssistantText(assistant);
        return NextResponse.json({
          message: text || "I couldn't produce an answer.",
          toolEvents,
        });
      }

      const functionToolCalls = toolCalls.filter(
        (
          call,
        ): call is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
          call.type === "function",
      );
      if (functionToolCalls.length === 0) {
        const text = readAssistantText(assistant);
        return NextResponse.json({
          message: text || "I couldn't produce an answer.",
          toolEvents,
        });
      }

      const currentSignature = JSON.stringify(
        functionToolCalls.map((call) => ({
          name: call.function.name,
          arguments: call.function.arguments,
        })),
      );
      if (currentSignature === lastToolSignature) {
        repeatedToolRounds += 1;
      } else {
        repeatedToolRounds = 0;
      }
      lastToolSignature = currentSignature;

      conversation.push({
        role: "assistant",
        content: assistant.content ?? "",
        tool_calls: functionToolCalls,
      });

      for (const toolCall of functionToolCalls) {
        const name = toolCall.function.name as GuideToolName;
        const rawArgs = safeParseArguments(toolCall.function.arguments ?? "{}");

        try {
          const payload = await executeGuideTool(request, name, rawArgs);
          const placeCards = buildPlaceCardsFromToolPayload(name, payload);
          const weatherCard = buildWeatherCardFromToolPayload(name, payload);
          const surfCard = buildSurfCardFromToolPayload(name, payload);
          toolEvents.push({
            name,
            arguments: rawArgs,
            ok: true,
            ...(placeCards.length > 0 ? { placeCards } : {}),
            ...(weatherCard ? { weatherCard } : {}),
            ...(surfCard ? { surfCard } : {}),
          });
          conversation.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(payload),
          });
        } catch (error) {
          const errorPayload =
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

          toolEvents.push({ name, arguments: rawArgs, ok: false });
          conversation.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ ok: false, error: errorPayload }),
          });
        }
      }

      if (repeatedToolRounds >= 1) {
        try {
          const forcedAnswer = await requestFinalAnswer(client, conversation);
          if (forcedAnswer) {
            return NextResponse.json({
              message: forcedAnswer,
              toolEvents,
            });
          }
        } catch {
          // Fall through to regular loop.
        }
      }
    }

    if (toolEvents.length > 0) {
      try {
        const forcedAnswer = await requestFinalAnswer(client, conversation);
        if (forcedAnswer) {
          return NextResponse.json({
            message: forcedAnswer,
            toolEvents,
          });
        }
      } catch {
        // Fall through to generic cap message.
      }
    }

    return NextResponse.json({
      message:
        "I hit a tool-processing limit while handling your request. Please try a narrower question.",
      toolEvents,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Chat request failed",
      },
      { status: 500 },
    );
  }
}
