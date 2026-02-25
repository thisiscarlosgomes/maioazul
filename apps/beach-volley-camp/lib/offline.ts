const OFFLINE_PREFIX = "/data/offline";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost";
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
      const offlineRes = await fetch(candidate, { cache: "no-store" });
      if (offlineRes.ok) return offlineRes;
    } catch {
      // Ignore offline lookup failures and fall back to the API.
    }
  }

  return fetch(apiUrl, init);
}

export async function fetchJsonOfflineFirst<T = any>(
  apiUrl: string,
  init?: RequestInit,
  offlineUrl?: string | null
): Promise<T> {
  try {
    const res = await fetchOfflineFirst(apiUrl, init, offlineUrl);
    if (!res.ok) {
      return {} as T;
    }
    return res.json() as Promise<T>;
  } catch {
    return {} as T;
  }
}
