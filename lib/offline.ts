const OFFLINE_PREFIX = "/data/offline";
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

type JsonCacheEntry = {
  expiresAt: number;
  value: unknown;
};

const jsonMemoryCache = new Map<string, JsonCacheEntry>();
const inflightJsonRequests = new Map<string, Promise<unknown>>();

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost";
}

function shouldBypassMemoryCache(init?: RequestInit) {
  const method = (init?.method ?? "GET").toUpperCase();
  return init?.cache === "no-store" || method !== "GET";
}

function cacheTtlForUrl(apiUrl: string) {
  try {
    const url = new URL(apiUrl, getBaseUrl());
    const path = url.pathname;

    if (path === "/api/places") return 24 * 60 * 60 * 1000;
    if (path.startsWith("/api/transparencia/turismo/2024/")) return 24 * 60 * 60 * 1000;
    if (
      path === "/api/maio/weather" ||
      path === "/api/maio/wind" ||
      path === "/api/maio/marine" ||
      path === "/api/maio/air"
    ) {
      return 15 * 60 * 1000;
    }
    if (path === "/api/schedules/boats" || path === "/api/schedules/flights") {
      return 15 * 60 * 1000;
    }
    if (
      path === "/api/transparencia/municipal/maio/orcamento" ||
      path === "/api/transparencia/nacional/receitas/cv" ||
      path === "/api/transparencia/transportes/overview"
    ) {
      return 60 * 60 * 1000;
    }
  } catch {
    // Ignore parse failures and keep default TTL.
  }

  return DEFAULT_CACHE_TTL_MS;
}

export function buildOfflineUrl(apiUrl: string) {
  try {
    const url = new URL(apiUrl, getBaseUrl());
    const path = url.pathname;
    const year = url.searchParams.get("year") ?? "2025";
    const ilha = url.searchParams.get("ilha") ?? "all";

    if (path === "/api/places") {
      return "/data/maio_places_with_coords.json";
    }

    if (path === "/api/maio/weather") {
      return `${OFFLINE_PREFIX}/maio/weather.json`;
    }

    if (path === "/api/maio/wind") {
      return `${OFFLINE_PREFIX}/maio/wind.json`;
    }

    if (path === "/api/maio/marine") {
      return `${OFFLINE_PREFIX}/maio/marine.json`;
    }

    if (path === "/api/maio/air") {
      return `${OFFLINE_PREFIX}/maio/air.json`;
    }

    if (path === "/api/schedules/boats") {
      return `${OFFLINE_PREFIX}/schedules/boats.json`;
    }

    if (path === "/api/schedules/flights") {
      return `${OFFLINE_PREFIX}/schedules/flights.json`;
    }

    if (path === "/api/transparencia/municipal/maio/core-metrics") {
      return `${OFFLINE_PREFIX}/transparencia/municipal/maio/core-metrics-${year}.json`;
    }

    if (path === "/api/transparencia/municipal/transferencias") {
      const municipio = url.searchParams.get("municipio") ?? "default";
      return `${OFFLINE_PREFIX}/transparencia/municipal/transferencias-${municipio}-${year}.json`;
    }

    if (path === "/api/transparencia/turismo/hoteis") {
      return `${OFFLINE_PREFIX}/transparencia/turismo/hoteis.json`;
    }

    if (path === "/api/transparencia/turismo/population") {
      return `${OFFLINE_PREFIX}/transparencia/turismo/population-${year}.json`;
    }

    if (path === "/api/transparencia/turismo/overview") {
      return `${OFFLINE_PREFIX}/transparencia/turismo/overview-${year}.json`;
    }

    if (path === "/api/transparencia/turismo/pressure") {
      return `${OFFLINE_PREFIX}/transparencia/turismo/pressure-${year}.json`;
    }

    if (path === "/api/transparencia/turismo/seasonality") {
      return `${OFFLINE_PREFIX}/transparencia/turismo/seasonality-${year}.json`;
    }

    if (path === "/api/transparencia/turismo/dependency") {
      return `${OFFLINE_PREFIX}/transparencia/turismo/dependency-${year}-${ilha}.json`;
    }

    if (path === "/api/transparencia/transportes/overview") {
      return `${OFFLINE_PREFIX}/transparencia/transportes/overview-${year}.json`;
    }

    const islandMatch = path.match(
      /^\/api\/transparencia\/turismo\/(\\d{4})\/island$/
    );
    if (islandMatch) {
      const yearFromPath = islandMatch[1];
      return `${OFFLINE_PREFIX}/transparencia/turismo/${yearFromPath}/island-${encodeURIComponent(
        ilha
      )}.json`;
    }

    if (path.startsWith("/api/transparencia/turismo/2024/")) {
      return `${OFFLINE_PREFIX}${path.replace("/api", "")}.json`;
    }

    return null;
  } catch {
    return null;
  }
}

export async function fetchOfflineFirst(
  apiUrl: string,
  init?: RequestInit,
  offlineUrl?: string | null
) {
  const candidate = offlineUrl ?? buildOfflineUrl(apiUrl);

  if (candidate) {
    try {
      const offlineRes = await fetch(candidate, {
        cache: shouldBypassMemoryCache(init) ? "no-store" : "force-cache",
      });
      if (offlineRes.ok) return offlineRes;
    } catch {
      // Ignore offline lookup failures and fall back to the API.
    }
  }

  return fetch(apiUrl, init);
}

export async function fetchJsonOfflineFirst<T = unknown>(
  apiUrl: string,
  init?: RequestInit,
  offlineUrl?: string | null
): Promise<T> {
  const bypassCache = shouldBypassMemoryCache(init);
  const cacheKey = `${apiUrl}::${offlineUrl ?? ""}`;
  const now = Date.now();

  if (!bypassCache) {
    const cached = jsonMemoryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }

    const pending = inflightJsonRequests.get(cacheKey);
    if (pending) {
      return pending as Promise<T>;
    }
  }

  const request = (async () => {
    try {
      const res = await fetchOfflineFirst(apiUrl, init, offlineUrl);
      if (!res.ok) {
        return {} as T;
      }
      const payload = (await res.json()) as T;

      if (!bypassCache) {
        jsonMemoryCache.set(cacheKey, {
          value: payload,
          expiresAt: Date.now() + cacheTtlForUrl(apiUrl),
        });
      }

      return payload;
    } catch {
      return {} as T;
    } finally {
      if (!bypassCache) {
        inflightJsonRequests.delete(cacheKey);
      }
    }
  })();

  if (!bypassCache) {
    inflightJsonRequests.set(cacheKey, request as Promise<unknown>);
  }

  try {
    return await request;
  } catch {
    return {} as T;
  }
}
