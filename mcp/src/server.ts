import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

type Query = Record<string, string | number | undefined | null>;
type SessionState = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

const SERVER_NAME = 'maioazul-dashboard-mcp';
const SERVER_VERSION = '0.1.0';
const DEFAULT_BASE_URL = process.env.DASHBOARD_BASE_URL ?? 'http://127.0.0.1:3000';
const REQUEST_TIMEOUT_MS = Number(process.env.MCP_REQUEST_TIMEOUT_MS ?? 15000);
const MCP_TRANSPORT = process.env.MCP_TRANSPORT ?? 'stdio';
const HTTP_HOST = process.env.MCP_HTTP_HOST ?? '127.0.0.1';
const HTTP_PORT = Number(process.env.MCP_HTTP_PORT ?? 3333);
const HTTP_PATH = process.env.MCP_HTTP_PATH ?? '/mcp';
const HEALTH_PATH = process.env.MCP_HEALTH_PATH ?? '/health';
const MIN_YEAR = 2024;
const MAX_YEAR = 2035;
const LEGAL_CHUNKS_ENV_PATH = process.env.LEGAL_CODE_CHUNKS_PATH;

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

let legalCorpusCache: { cacheKey: string; corpus: LegalCorpus } | null = null;

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
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
    if (entry.isFile() && extname(entry.name).toLowerCase() === '.jsonl') {
      out.push(fullPath);
    }
  }
  return out;
}

function resolveLegalChunksPaths(): string[] {
  const roots = [
    LEGAL_CHUNKS_ENV_PATH,
    resolve(process.cwd(), 'data/codigo_postura/chunks.jsonl'),
    resolve(process.cwd(), 'data/codigo_postura'),
    resolve(process.cwd(), '../data/codigo_postura/chunks.jsonl'),
    resolve(process.cwd(), '../data/codigo_postura'),
    resolve(process.cwd(), '../../data/codigo_postura/chunks.jsonl'),
    resolve(process.cwd(), '../../data/codigo_postura'),
  ].filter((value): value is string => Boolean(value));

  const files = new Set<string>();
  for (const path of roots) {
    if (!existsSync(path)) continue;
    const stats = statSync(path);
    if (stats.isDirectory()) {
      for (const file of listJsonlFilesRecursively(path)) files.add(file);
      continue;
    }
    if (stats.isFile() && extname(path).toLowerCase() === '.jsonl') {
      files.add(path);
    }
  }

  const resolved = [...files].sort();
  if (resolved.length === 0) {
    throw new Error(
      `Legal chunks files not found. Set LEGAL_CODE_CHUNKS_PATH (file/dir) or place chunks under data/codigo_postura.`,
    );
  }
  return resolved;
}

function loadLegalCorpus(): LegalCorpus {
  const paths = resolveLegalChunksPaths();
  const cacheKey = paths.join('|');
  if (legalCorpusCache && legalCorpusCache.cacheKey === cacheKey) {
    return legalCorpusCache.corpus;
  }

  const rows: IndexedLegalChunk[] = [];
  for (const path of paths) {
    const fileRows = readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as LegalChunk)
      .map((row) => ({
        ...row,
        _search: normalizeSearchText(
          [row.title, row.chapter, row.section, row.article_heading, row.text].filter(Boolean).join(' '),
        ),
      }));
    rows.push(...fileRows);
  }

  const corpus: LegalCorpus = { paths, chunks: rows };
  legalCorpusCache = { cacheKey, corpus };
  return corpus;
}

function countOccurrences(haystack: string, needle: string): number {
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

function isSuspiciousLine(line: string): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const trimmed = line.trim();
  if (!trimmed) return { suspicious: false, reasons };

  const alnum = (trimmed.match(/[a-z0-9]/gi) ?? []).length;
  const nonAlnum = trimmed.length - alnum;
  const nonAlnumRatio = trimmed.length ? nonAlnum / trimmed.length : 0;

  if (trimmed.includes('�')) reasons.push('replacement_char');
  if (/^[\W_]{4,}$/.test(trimmed)) reasons.push('punctuation_only');
  if (trimmed.length <= 2) reasons.push('very_short_line');
  if (/[A-Z0-9]{4,}\/[A-Z0-9]{2,}\/[A-Z0-9]{2,}/.test(trimmed)) reasons.push('registry_code_artifact');
  if (nonAlnumRatio > 0.45 && trimmed.length >= 10) reasons.push('high_symbol_ratio');
  if (/(.)\1{5,}/.test(trimmed)) reasons.push('repeated_character_run');
  if (/\b(?:[A-Za-zÀ-ÿ]\s){5,}[A-Za-zÀ-ÿ]\b/.test(trimmed)) reasons.push('split_word_pattern');

  return { suspicious: reasons.length > 0, reasons };
}

class ToolHttpError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'ToolHttpError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(path, DEFAULT_BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function fetchJson(path: string, query?: Query): Promise<unknown> {
  const url = buildUrl(path, query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
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

function ok(tool: string, payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ tool, ok: true, payload }, null, 2),
      },
    ],
  };
}

function fail(tool: string, error: unknown) {
  if (error instanceof ToolHttpError) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              tool,
              ok: false,
              error: {
                type: 'upstream_http_error',
                status: error.status,
                message: error.message,
                body: error.body.slice(0, 1000),
              },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }

  if (error instanceof Error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              tool,
              ok: false,
              error: {
                type: 'internal_error',
                message: error.message,
              },
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            tool,
            ok: false,
            error: {
              type: 'unknown_error',
              message: 'Unknown error',
            },
          },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

function createMcpAppServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.registerTool(
    'get_tourism_overview',
    {
      title: 'Get Tourism Overview',
      description: 'Fetches island tourism summary by quarter and totals for a year from municipal Maio tourism data.',
      inputSchema: {
        year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional().describe('Reference year. Defaults to 2025 in upstream API.'),
      },
    },
    async ({ year }) => {
      try {
        const data = await fetchJson('/api/transparencia/municipal/maio/turism/overview', { year });
        return ok('get_tourism_overview', data);
      } catch (error) {
        return fail('get_tourism_overview', error);
      }
    },
  );

  server.registerTool(
    'get_tourism_indicators',
    {
      title: 'Get Tourism Indicators',
      description:
        'Returns tourism pressure, seasonality, and local-retention proxy for an island/year using your existing indicators API.',
      inputSchema: {
        ilha: z.enum(['Maio', 'Sal', 'Boa Vista']).default('Maio').describe('Island name used by the upstream API.'),
        year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025).describe('Reference year.'),
      },
    },
    async ({ ilha, year }) => {
      try {
        const data = await fetchJson('/api/transparencia/municipal/maio/turism/indicators', { ilha, year });
        return ok('get_tourism_indicators', data);
      } catch (error) {
        return fail('get_tourism_indicators', error);
      }
    },
  );

  server.registerTool(
    'get_maio_core_metrics',
    {
      title: 'Get Maio Core Metrics',
      description: 'Returns Maio municipal core metrics with optional filters and bounded row count.',
      inputSchema: {
        year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional().describe('Reference year. If omitted, API returns latest year.'),
        category: z.string().min(1).max(64).optional().describe('Category filter from maio_core_metrics.'),
        metric: z.string().min(1).max(64).optional().describe('Metric name filter from maio_core_metrics.'),
        limit: z.number().int().min(1).max(200).default(100).describe('Maximum number of metric rows returned to the client.'),
      },
    },
    async ({ year, category, metric, limit }) => {
      try {
        const payload = (await fetchJson('/api/transparencia/municipal/maio/core-metrics', {
          year,
          category,
          metric,
        })) as { data?: unknown[] };

        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const bounded = rows.slice(0, limit);

        return ok('get_maio_core_metrics', {
          ...payload,
          data: bounded,
          limits: {
            requested_limit: limit,
            total_rows_available: rows.length,
            returned_rows: bounded.length,
          },
        });
      } catch (error) {
        return fail('get_maio_core_metrics', error);
      }
    },
  );

  server.registerTool(
    'get_tourism_quarters',
    {
      title: 'Get Tourism Quarters',
      description: 'Returns quarterly guest/night aggregates per island for a year.',
      inputSchema: {
        year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025).describe('Reference year.'),
      },
    },
    async ({ year }) => {
      try {
        const data = await fetchJson('/api/transparencia/turismo/quarters', { year });
        return ok('get_tourism_quarters', data);
      } catch (error) {
        return fail('get_tourism_quarters', error);
      }
    },
  );

  server.registerTool(
    'get_transport_overview',
    {
      title: 'Get Transport Overview',
      description:
        'Returns transportation indicators for Cabo Verde (maritime and air), including 2024-2025 comparison metrics and optional island filtering (e.g., Maio).',
      inputSchema: {
        year: z.number().int().min(MIN_YEAR).max(MAX_YEAR).default(2025).describe('Reference year. Transport dataset currently available for 2025.'),
        ilha: z.string().min(1).max(64).optional().describe('Optional island filter (e.g., Maio).'),
      },
    },
    async ({ year, ilha }) => {
      try {
        const payload = (await fetchJson('/api/transparencia/transportes/overview', { year })) as {
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
          typeof ilha === 'string' && ilha.trim() && ilha !== 'Todas as Ilhas'
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
            .map((row, index) => [String(row.port ?? ''), index + 1]),
        );
        const maritimePassengerRankMap = new Map(
          maritimePassengerRows
            .slice()
            .sort((a, b) => Number(b.passengers ?? 0) - Number(a.passengers ?? 0))
            .map((row, index) => [String(row.port ?? ''), index + 1]),
        );

        return ok('get_transport_overview', {
          dataset: payload?.dataset ?? 'cabo_verde_transportes_2025',
          year: payload?.as_of_year ?? year,
          island_filter: islandFilter,
          summary: {
            ships_total: ships.reduce((sum, row) => sum + Number(row.movements ?? 0), 0),
            maritime_passengers_total: maritimePassengers.reduce(
              (sum, row) => sum + Number(row.passengers ?? 0),
              0,
            ),
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
              ranking_cv: shipsRankMap.get(String(row.port ?? '')) ?? null,
            })),
            passengers_by_port_2025: maritimePassengers.map((row) => ({
              ...row,
              ranking_cv: maritimePassengerRankMap.get(String(row.port ?? '')) ?? null,
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
        });
      } catch (error) {
        return fail('get_transport_overview', error);
      }
    },
  );

  server.registerTool(
    'search_codigo_postura',
    {
      title: 'Search Codigo de Postura',
      description:
        'Searches the local Codigo de Postura corpus and returns ranked text snippets with article and page citations.',
      inputSchema: {
        query: z.string().min(2).max(300).describe('Natural-language query in Portuguese or English.'),
        top_k: z.number().int().min(1).max(20).default(5).describe('Maximum number of ranked results.'),
        article_number: z.number().int().min(1).max(1000).optional().describe('Optional exact article number filter.'),
        doc_id: z.string().min(2).max(120).optional().describe('Optional document id filter when multiple legal corpora are loaded.'),
      },
    },
    async ({ query, top_k, article_number, doc_id }) => {
      try {
        const { paths, chunks } = loadLegalCorpus();
        const queryNorm = normalizeSearchText(query);
        const queryTokens = queryNorm.split(' ').filter((token) => token.length >= 2);

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
            const snippet = chunk.text.replace(/\s+/g, ' ').trim().slice(0, 420);
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
              snippet,
            };
          })
          .filter((row): row is NonNullable<typeof row> => Boolean(row))
          .sort((a, b) => b.score - a.score)
          .slice(0, top_k);

        return ok('search_codigo_postura', {
          query,
          top_k,
          article_number: article_number ?? null,
          doc_id: doc_id ?? null,
          corpus_paths: paths,
          total_results: ranked.length,
          results: ranked,
        });
      } catch (error) {
        return fail('search_codigo_postura', error);
      }
    },
  );

  server.registerTool(
    'get_codigo_postura_article',
    {
      title: 'Get Codigo de Postura Article',
      description: 'Returns full text for one article number with page/title/chapter citations.',
      inputSchema: {
        article_number: z.number().int().min(1).max(1000).describe('Exact article number to retrieve.'),
        doc_id: z.string().min(2).max(120).optional().describe('Optional document id filter when multiple legal corpora are loaded.'),
        max_chars: z.number().int().min(200).max(60000).default(12000).describe('Maximum number of characters returned in article text.'),
      },
    },
    async ({ article_number, doc_id, max_chars }) => {
      try {
        const { paths, chunks } = loadLegalCorpus();
        const articleChunks = chunks
          .filter((chunk) => chunk.article_number === article_number)
          .filter((chunk) => (doc_id ? chunk.doc_id === doc_id : true))
          .sort(articleSort);

        if (articleChunks.length === 0) {
          throw new Error(`Article ${article_number} not found${doc_id ? ` for doc_id=${doc_id}` : ''}.`);
        }

        const fullText = articleChunks.map((chunk) => chunk.text.trim()).join('\n\n').trim();
        const trimmed = fullText.slice(0, max_chars);
        const first = articleChunks[0];
        const pages = articleChunks.map((chunk) => chunk.page_start);
        const pageStart = Math.min(...pages);
        const pageEnd = Math.max(...articleChunks.map((chunk) => chunk.page_end));

        return ok('get_codigo_postura_article', {
          article_number,
          doc_id: first.doc_id,
          article_heading: first.article_heading ?? null,
          title: first.title ?? null,
          chapter: first.chapter ?? null,
          section: first.section ?? null,
          page_start: pageStart,
          page_end: pageEnd,
          chunks_used: articleChunks.length,
          corpus_paths: paths,
          truncated: fullText.length > trimmed.length,
          char_count: trimmed.length,
          text: trimmed,
          source_pdf: first.source_pdf,
        });
      } catch (error) {
        return fail('get_codigo_postura_article', error);
      }
    },
  );

  server.registerTool(
    'list_codigo_postura_articles',
    {
      title: 'List Codigo de Postura Articles',
      description: 'Lists available article numbers and citations for loaded legal corpus documents.',
      inputSchema: {
        doc_id: z.string().min(2).max(120).optional().describe('Optional document id filter when multiple legal corpora are loaded.'),
        limit: z.number().int().min(1).max(1000).default(400).describe('Maximum number of article entries returned.'),
      },
    },
    async ({ doc_id, limit }) => {
      try {
        const { paths, chunks } = loadLegalCorpus();
        const filtered = chunks
          .filter((chunk) => chunk.article_number != null)
          .filter((chunk) => (doc_id ? chunk.doc_id === doc_id : true))
          .sort(articleSort);

        const byArticle = new Map<string, IndexedLegalChunk[]>();
        for (const chunk of filtered) {
          const key = `${chunk.doc_id}:${chunk.article_number}`;
          const list = byArticle.get(key) ?? [];
          list.push(chunk);
          byArticle.set(key, list);
        }

        const articles = [...byArticle.entries()]
          .map(([, rows]) => {
            const first = rows[0];
            return {
              doc_id: first.doc_id,
              article_number: first.article_number ?? null,
              article_heading: first.article_heading ?? null,
              title: first.title ?? null,
              chapter: first.chapter ?? null,
              section: first.section ?? null,
              page_start: Math.min(...rows.map((row) => row.page_start)),
              page_end: Math.max(...rows.map((row) => row.page_end)),
              chunk_count: rows.length,
            };
          })
          .sort((a, b) => {
            if (a.doc_id !== b.doc_id) return a.doc_id.localeCompare(b.doc_id);
            return (a.article_number ?? 0) - (b.article_number ?? 0);
          });

        return ok('list_codigo_postura_articles', {
          doc_id: doc_id ?? null,
          corpus_paths: paths,
          total_articles: articles.length,
          returned_articles: Math.min(limit, articles.length),
          articles: articles.slice(0, limit),
        });
      } catch (error) {
        return fail('list_codigo_postura_articles', error);
      }
    },
  );

  server.registerTool(
    'get_codigo_postura_stats',
    {
      title: 'Get Codigo de Postura Stats',
      description: 'Returns loaded legal corpus coverage and document/article counts.',
      inputSchema: {},
    },
    async () => {
      try {
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

        return ok('get_codigo_postura_stats', {
          corpus_paths: paths,
          total_chunks: chunks.length,
          total_docs: docSummaries.length,
          docs: docSummaries,
        });
      } catch (error) {
        return fail('get_codigo_postura_stats', error);
      }
    },
  );

  server.registerTool(
    'get_codigo_postura_qa',
    {
      title: 'Get Codigo de Postura QA',
      description:
        'Runs extraction-quality checks on loaded legal chunks and returns suspicious lines with citations and severity.',
      inputSchema: {
        doc_id: z.string().min(2).max(120).optional().describe('Optional document id filter when multiple legal corpora are loaded.'),
        sample_limit: z.number().int().min(5).max(200).default(40).describe('Maximum suspicious line samples to return.'),
      },
    },
    async ({ doc_id, sample_limit }) => {
      try {
        const { paths, chunks } = loadLegalCorpus();
        const filtered = chunks.filter((chunk) => (doc_id ? chunk.doc_id === doc_id : true));
        if (filtered.length === 0) {
          throw new Error(`No chunks found${doc_id ? ` for doc_id=${doc_id}` : ''}.`);
        }

        const repeatedLineMap = new Map<string, number>();
        for (const chunk of filtered) {
          for (const rawLine of chunk.text.split('\n')) {
            const line = rawLine.trim();
            if (!line) continue;
            repeatedLineMap.set(line, (repeatedLineMap.get(line) ?? 0) + 1);
          }
        }

        const suspiciousSamples: Array<{
          line: string;
          reasons: string[];
          doc_id: string;
          article_number: number | null;
          page_start: number;
          page_end: number;
          chunk_id: string;
        }> = [];
        const reasonCounts = new Map<string, number>();
        let totalLines = 0;
        let suspiciousLines = 0;

        for (const chunk of filtered) {
          for (const rawLine of chunk.text.split('\n')) {
            const line = rawLine.trim();
            if (!line) continue;
            totalLines += 1;

            const check = isSuspiciousLine(line);
            const repeatedCount = repeatedLineMap.get(line) ?? 0;
            const reasons = [...check.reasons];
            if (repeatedCount >= 10 && !/^Artigo\s+\d+/i.test(line)) {
              reasons.push('high_repetition_line');
            }

            if (reasons.length === 0) continue;
            suspiciousLines += 1;
            for (const reason of reasons) {
              reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
            }

            if (suspiciousSamples.length < sample_limit) {
              suspiciousSamples.push({
                line: line.slice(0, 300),
                reasons,
                doc_id: chunk.doc_id,
                article_number: chunk.article_number ?? null,
                page_start: chunk.page_start,
                page_end: chunk.page_end,
                chunk_id: chunk.id,
              });
            }
          }
        }

        const suspiciousRatio = totalLines ? suspiciousLines / totalLines : 0;
        const severity =
          suspiciousRatio < 0.004 ? 'low' : suspiciousRatio < 0.015 ? 'moderate' : suspiciousRatio < 0.04 ? 'high' : 'critical';

        return ok('get_codigo_postura_qa', {
          doc_id: doc_id ?? null,
          corpus_paths: paths,
          analyzed_chunks: filtered.length,
          total_lines: totalLines,
          suspicious_lines: suspiciousLines,
          suspicious_ratio: Number(suspiciousRatio.toFixed(5)),
          severity,
          reason_breakdown: [...reasonCounts.entries()]
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count),
          samples: suspiciousSamples,
        });
      } catch (error) {
        return fail('get_codigo_postura_qa', error);
      }
    },
  );

  return server;
}

function writeJson(res: ServerResponse, status: number, body: unknown, headers?: Record<string, string>) {
  res.writeHead(status, {
    'content-type': 'application/json',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function logHttpRequest(req: IncomingMessage, status: number, startTime: number, meta?: Record<string, unknown>) {
  const durationMs = Date.now() - startTime;
  const payload = {
    scope: 'mcp-http',
    method: req.method ?? 'UNKNOWN',
    path: req.url ?? '',
    status,
    duration_ms: durationMs,
    ...meta,
  };

  console.error(JSON.stringify(payload));
}

function writeJsonRpcError(
  res: ServerResponse,
  status: number,
  message: string,
  code = -32000,
  headers?: Record<string, string>,
) {
  writeJson(
    res,
    status,
    {
      jsonrpc: '2.0',
      error: {
        code,
        message,
      },
      id: null,
    },
    headers,
  );
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function startStdioServer() {
  const server = createMcpAppServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} running on stdio (base URL: ${DEFAULT_BASE_URL})`);
}

async function startHttpServer() {
  const sessions = new Map<string, SessionState>();

  const closeAllSessions = async () => {
    const activeSessions = Array.from(sessions.entries());
    sessions.clear();

    await Promise.allSettled(
      activeSessions.map(async ([, session]) => {
        await session.transport.close();
        await session.server.close();
      }),
    );
  };

  const nodeServer = createServer(async (req, res) => {
    const startTime = Date.now();

    try {
      if (!req.url) {
        writeJsonRpcError(res, 400, 'Bad Request: Missing URL');
        logHttpRequest(req, 400, startTime);
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host ?? `${HTTP_HOST}:${HTTP_PORT}`}`);
      if (url.pathname === HEALTH_PATH) {
        writeJson(res, 200, {
          ok: true,
          service: SERVER_NAME,
          version: SERVER_VERSION,
          transport: 'http',
          path: HTTP_PATH,
          sessions: sessions.size,
          dashboard_base_url: DEFAULT_BASE_URL,
        });
        logHttpRequest(req, 200, startTime, { health: true });
        return;
      }

      if (url.pathname !== HTTP_PATH) {
        writeJson(res, 404, { error: 'Not found' });
        logHttpRequest(req, 404, startTime);
        return;
      }

      if (req.method === 'GET') {
        writeJsonRpcError(res, 405, 'Method not allowed. Use POST for Streamable HTTP JSON responses.', -32000, {
          allow: 'POST',
        });
        logHttpRequest(req, 405, startTime);
        return;
      }

      if (req.method !== 'POST') {
        writeJsonRpcError(res, 405, 'Method not allowed.', -32000, {
          allow: 'POST',
        });
        logHttpRequest(req, 405, startTime);
        return;
      }

      const parsedBody = await readJsonBody(req);
      const sessionHeader = req.headers['mcp-session-id'];
      const sessionId = Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader;

      if (sessionId) {
        const existingSession = sessions.get(sessionId);
        if (!existingSession) {
          writeJsonRpcError(res, 404, 'Session not found.');
          logHttpRequest(req, 404, startTime, { session_id: sessionId, session_found: false });
          return;
        }

        await existingSession.transport.handleRequest(req, res, parsedBody);
        logHttpRequest(req, res.statusCode || 200, startTime, { session_id: sessionId, session_found: true });
        return;
      }

      if (!isInitializeRequest(parsedBody)) {
        writeJsonRpcError(res, 400, 'Bad Request: No valid session ID provided.');
        logHttpRequest(req, 400, startTime, { initialize: false });
        return;
      }

      const server = createMcpAppServer();
      let initializedSessionId: string | undefined;
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (newSessionId) => {
          initializedSessionId = newSessionId;
          sessions.set(newSessionId, { server, transport });
        },
      });

      transport.onclose = () => {
        if (initializedSessionId) {
          sessions.delete(initializedSessionId);
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
      logHttpRequest(req, res.statusCode || 200, startTime, {
        initialize: true,
        session_id: initializedSessionId,
      });
    } catch (error) {
      console.error('Error handling MCP HTTP request:', error);
      if (!res.headersSent) {
        writeJsonRpcError(res, 500, 'Internal server error', -32603);
      } else {
        res.end();
      }
      logHttpRequest(req, 500, startTime, {
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  });

  nodeServer.listen(HTTP_PORT, HTTP_HOST, () => {
    console.error(
      `${SERVER_NAME} running on http://${HTTP_HOST}:${HTTP_PORT}${HTTP_PATH} (health: ${HEALTH_PATH}, base URL: ${DEFAULT_BASE_URL}, JSON response mode)`,
    );
  });

  const shutdown = async () => {
    nodeServer.close();
    await closeAllSessions();
  };

  process.on('SIGINT', async () => {
    await shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdown();
    process.exit(0);
  });
}

async function main() {
  if (MCP_TRANSPORT === 'http') {
    await startHttpServer();
    return;
  }

  if (MCP_TRANSPORT !== 'stdio') {
    throw new Error(`Unsupported MCP_TRANSPORT "${MCP_TRANSPORT}". Use "stdio" or "http".`);
  }

  await startStdioServer();
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
