import { z } from "zod";

type Query = Record<string, string | number | undefined | null>;

const REQUEST_TIMEOUT_MS = Number(process.env.MCP_REQUEST_TIMEOUT_MS ?? 15000);
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
  get_places: z
    .object({
      query: z.string().min(1).max(120).optional(),
      category: z.string().min(1).max(64).optional(),
      tag: z.string().min(1).max(64).optional(),
      limit: z.number().int().min(1).max(50).default(12),
    })
    .strict(),
  get_place_detail: z
    .object({
      id: z.string().min(1).max(120),
    })
    .strict(),
  get_maio_weather: z.object({}).strict(),
  get_maio_wind: z.object({}).strict(),
  get_maio_surf: z.object({}).strict(),
  get_boat_schedules: z.object({}).strict(),
  get_flight_schedules: z.object({}).strict(),
  get_tourism_overview: z
    .object({
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025),
    })
    .strict(),
  get_tourism_quarters: z
    .object({
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025),
    })
    .strict(),
  get_maio_core_metrics: z
    .object({
      year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional(),
      category: z.string().min(1).max(64).optional(),
      metric: z.string().min(1).max(64).optional(),
    })
    .strict(),
};

export type GuideToolName = keyof typeof toolSchemas;

export const nativeToolDefinitions: Record<
  GuideToolName,
  {
    title: string;
    description: string;
    parameters: Record<string, unknown>;
  }
> = {
  get_places: {
    title: "Get Places",
    description:
      "Returns places on Maio island with optional search, category, and tag filters.",
    parameters: {
      type: "object",
      properties: {
        query: { type: ["string", "null"] },
        category: { type: ["string", "null"] },
        tag: { type: ["string", "null"] },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      required: [],
      additionalProperties: false,
    },
  },
  get_place_detail: {
    title: "Get Place Detail",
    description: "Returns full details for one place by id.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, maxLength: 120 },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  get_maio_weather: {
    title: "Get Maio Weather",
    description: "Returns current and daily weather for Maio island.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  get_maio_wind: {
    title: "Get Maio Wind",
    description: "Returns wind and sea conditions for Maio island.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  get_maio_surf: {
    title: "Get Maio Surf",
    description: "Returns 6am/noon/6pm surf outlook for Maio island.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  get_boat_schedules: {
    title: "Get Boat Schedules",
    description: "Returns ferry schedules between Santiago and Maio.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  get_flight_schedules: {
    title: "Get Flight Schedules",
    description: "Returns route schedules between Praia (RAI) and Maio (MMO).",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  get_tourism_overview: {
    title: "Get Tourism Overview",
    description: "Returns tourism overview by island for a given year.",
    parameters: {
      type: "object",
      properties: {
        year: { type: "integer", minimum: MIN_YEAR, maximum: MAX_YEAR },
      },
      required: ["year"],
      additionalProperties: false,
    },
  },
  get_tourism_quarters: {
    title: "Get Tourism Quarters",
    description: "Returns quarterly tourism aggregates by island for a given year.",
    parameters: {
      type: "object",
      properties: {
        year: { type: "integer", minimum: MIN_YEAR, maximum: MAX_YEAR },
      },
      required: ["year"],
      additionalProperties: false,
    },
  },
  get_maio_core_metrics: {
    title: "Get Maio Core Metrics",
    description: "Returns Maio municipal core metrics with optional filters.",
    parameters: {
      type: "object",
      properties: {
        year: { type: ["integer", "null"], minimum: MIN_YEAR, maximum: MAX_YEAR },
        category: { type: ["string", "null"] },
        metric: { type: ["string", "null"] },
      },
      required: [],
      additionalProperties: false,
    },
  },
};

export const openAIFunctionTools = (Object.entries(nativeToolDefinitions) as Array<
  [GuideToolName, (typeof nativeToolDefinitions)[GuideToolName]]
>).map(([name, definition]) => ({
  type: "function" as const,
  function: {
    name,
    description: definition.description,
    parameters: definition.parameters,
  },
}));

function stripNullishFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripNullishFields(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== undefined)
      .map(([key, item]) => [key, stripNullishFields(item)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

function buildUrl(request: Request, endpoint: string, query?: Query) {
  const url = new URL(endpoint, request.url);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || `${value}`.trim() === "") continue;
      url.searchParams.set(key, `${value}`);
    }
  }
  return url.toString();
}

async function fetchJson(request: Request, endpoint: string, query?: Query) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const url = buildUrl(request, endpoint, query);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const raw = await response.text();
    let payload: unknown;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = raw;
    }

    if (!response.ok) {
      throw new ToolHttpError(`Request failed (${response.status}) for ${endpoint}`, response.status, raw);
    }

    return payload;
  } catch (error) {
    if (error instanceof ToolHttpError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new ToolHttpError(`Request timeout for ${endpoint}`, 504, "timeout");
    }

    throw new ToolHttpError(
      `Failed request for ${endpoint}`,
      500,
      error instanceof Error ? error.message : "unknown_error",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function pickName(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const candidate = value as { en?: string; pt?: string };
    return candidate.en ?? candidate.pt ?? "";
  }
  return "";
}

export async function executeGuideTool(request: Request, name: GuideToolName, rawArgs: unknown) {
  const normalizedArgs = stripNullishFields((rawArgs ?? {}) as Record<string, unknown>);
  const args = toolSchemas[name].parse(normalizedArgs);

  switch (name) {
    case "get_places": {
      const payload = await fetchJson(request, "/api/places");
      const list = asArray<Record<string, unknown>>(payload);
      const query = normalizeText(args.query);
      const category = normalizeText(args.category);
      const tag = normalizeText(args.tag);

      const filtered = list.filter((place) => {
        const placeName = normalizeText(pickName(place.name));
        const placeCategory = normalizeText(place.category);
        const placeTags = asArray<string>(place.tags).map((value) => normalizeText(value));

        if (query) {
          const description = normalizeText(
            typeof place.description === "string"
              ? place.description
              : (place.description as { en?: string; pt?: string } | undefined)?.en ??
                  (place.description as { en?: string; pt?: string } | undefined)?.pt ??
                  "",
          );
          const location = normalizeText(
            typeof place.location === "string"
              ? place.location
              : (place.location as { en?: string; pt?: string } | undefined)?.en ??
                  (place.location as { en?: string; pt?: string } | undefined)?.pt ??
                  "",
          );

          if (!placeName.includes(query) && !description.includes(query) && !location.includes(query)) {
            return false;
          }
        }

        if (category && !placeCategory.includes(category)) {
          return false;
        }

        if (tag && !placeTags.some((value) => value.includes(tag))) {
          return false;
        }

        return true;
      });

      return {
        total: filtered.length,
        items: filtered.slice(0, args.limit),
      };
    }

    case "get_place_detail": {
      return fetchJson(request, `/api/places/${encodeURIComponent(args.id)}`);
    }

    case "get_maio_weather":
      return fetchJson(request, "/api/maio/weather");

    case "get_maio_wind":
      return fetchJson(request, "/api/maio/wind");

    case "get_maio_surf":
      return fetchJson(request, "/api/maio/surf");

    case "get_boat_schedules":
      return fetchJson(request, "/api/schedules/boats");

    case "get_flight_schedules":
      return fetchJson(request, "/api/schedules/flights");

    case "get_tourism_overview":
      return fetchJson(request, "/api/transparencia/turismo/overview", {
        year: args.year,
      });

    case "get_tourism_quarters":
      return fetchJson(request, "/api/transparencia/turismo/quarters", {
        year: args.year,
      });

    case "get_maio_core_metrics":
      return fetchJson(request, "/api/transparencia/municipal/maio/core-metrics", {
        year: args.year,
        category: args.category,
        metric: args.metric,
      });
  }
}
