import { resolveAstronomy } from "./astronomy.mjs";
import { queryConstellations } from "./constellations.mjs";
import { queryNightSky } from "./night-sky.mjs";
import { describeSource, interoperabilityCatalog } from "./interoperability.mjs";
import { parameters as environmentalParameters } from "./environment.mjs";
import { createHash } from "node:crypto";
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type, If-None-Match",
  "Access-Control-Expose-Headers": "ETag, X-Data-Revision",
  "X-Content-Type-Options": "nosniff",
};
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (message) => {
  throw new ApiError(400, message);
};
const integer = (params, key, fallback, min, max) => {
  const value = params.get(key);
  if (value === null) return fallback;
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    fail(`${key} must be an integer from ${min} to ${max}.`);
  return Number(value);
};
const fold = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const catalog = (s) =>
  s.collections.map((c) => ({
    ...c,
    links: {
      self: `/api/v1/collections/${c.id}`,
      items: `/api/v1/collections/${c.id}/items`,
    },
  }));
export const datasetCatalog = (s) =>
  s.datasets.map(({ payload, records, ...d }) => ({
    ...d,
    url: `/api/v1/datasets/${d.id}`,
    links: { self: `/api/v1/datasets/${d.id}`, records: `/api/v1/datasets/${d.id}/records`, sources: (d.sourceIds || []).map(id => `/api/v1/sources/${encodeURIComponent(id)}`) },
  }));
export function queryFeatures(
  snapshot,
  params,
  collection,
  path = "/api/v1/features",
) {
  for (const [key] of params) {
    if (
      !["collection", "q", "bbox", "limit", "offset", "geometry", "sourceId"].includes(key)
    )
      fail(`Unknown query parameter: ${key}`);
    if (params.getAll(key).length !== 1)
      fail(`Duplicate query parameter: ${key}`);
  }
  if (
    collection &&
    params.has("collection") &&
    params.get("collection") !== collection
  )
    fail("collection conflicts with the collection in the URL.");
  const selected = collection || params.get("collection");
  if (selected !== null && !snapshot.collections.some((c) => c.id === selected))
    throw new ApiError(404, "Collection not found.");
  const limit = integer(params, "limit", 100, 1, 500),
    offset = integer(params, "offset", 0, 0, Number.MAX_SAFE_INTEGER);
  const q = params.get("q") || "";
  if (q.length > 200) fail("q must contain at most 200 characters.");
  const geometry = params.get("geometry");
  if (geometry !== null && !["available", "missing"].includes(geometry))
    fail("geometry must be available or missing.");
  let bbox = null;
  if (params.has("bbox")) {
    const parts = params.get("bbox").split(",");
    bbox = parts.map(Number);
    if (
      parts.length !== 4 ||
      parts.some((v) => !v.trim()) ||
      bbox.some((v) => !Number.isFinite(v)) ||
      bbox[0] < -180 ||
      bbox[2] > 180 ||
      bbox[1] < -90 ||
      bbox[3] > 90 ||
      bbox[0] >= bbox[2] ||
      bbox[1] >= bbox[3]
    )
      fail(
        "bbox must be west,south,east,north in WGS84, with west < east and south < north.",
      );
  }
  const matches = snapshot.features.filter(
    (f) =>
      f.properties.publicationStatus !== "withdrawn" &&
      (!selected || f.properties.collections.includes(selected)) &&
      (!params.has("sourceId") || f.properties.sourceIds.includes(params.get("sourceId"))) &&
      (!geometry || f.properties.geometryStatus === geometry) &&
      (!q || fold(JSON.stringify(f.properties.attributes)).includes(fold(q))) &&
      (!bbox ||
        (f.bbox &&
          f.bbox[0] <= bbox[2] &&
          f.bbox[2] >= bbox[0] &&
          f.bbox[1] <= bbox[3] &&
          f.bbox[3] >= bbox[1])),
  );
  const link = (n) => {
    const p = new URLSearchParams(params);
    p.set("limit", String(limit));
    p.set("offset", String(n));
    return `${path}?${p}`;
  };
  return {
    type: "FeatureCollection",
    ...(selected === "roads" ? { status: "planned", publicationStatus: "withdrawn", caveats: ["Roads temporarily withdrawn pending source-data review."] } : {}),
    revision: snapshot.revision,
    numberMatched: matches.length,
    numberReturned: matches.slice(offset, offset + limit).length,
    limit,
    offset,
    features: matches.slice(offset, offset + limit),
    links: {
      self: link(offset),
      next: offset + limit < matches.length ? link(offset + limit) : null,
      previous: offset > 0 ? link(Math.max(0, offset - limit)) : null,
    },
    attribution:
      "Source attribution and reuse terms: /api/v1/sources. Bounding-box filtering uses feature envelopes, not exact geometry intersection.",
  };
}
const infrastructureCollections = new Set(["public-infrastructure", "schools", "health", "government", "water-points", "waste-infrastructure", "connectivity", "sports", "transport"]);
function validateParams(params, allowed) {
  for (const key of params.keys()) {
    if (!allowed.includes(key)) fail(`Unknown query parameter: ${key}`);
    if (params.getAll(key).length !== 1) fail(`Duplicate query parameter: ${key}`);
    if (params.get(key).length > 200) fail(`${key} must contain at most 200 characters.`);
  }
}
function page(snapshot, params, path, key, items, extra = {}) {
  const limit = integer(params, "limit", 100, 1, 500);
  const offset = integer(params, "offset", 0, 0, Number.MAX_SAFE_INTEGER);
  const link = n => {
    const query = new URLSearchParams(params);
    query.set("limit", String(limit)); query.set("offset", String(n));
    return `${path}?${query}`;
  };
  const rows = items.slice(offset, offset + limit);
  return { revision: snapshot.revision, ...extra, numberMatched: items.length,
    numberReturned: rows.length, limit, offset, [key]: rows,
    links: { self: link(offset), next: offset + limit < items.length ? link(offset + limit) : null,
      previous: offset > 0 ? link(Math.max(0, offset - limit)) : null } };
}
function placeView(place) {
  const { associations, ...publicPlace } = place;
  const base = `/api/v1/places/${encodeURIComponent(place.id)}`;
  return { ...publicPlace, links: { self: base, features: `${base}/features`,
    datasets: `${base}/datasets`, infrastructure: `${base}/infrastructure` } };
}
function resolvePlaces(snapshot, segments, params) {
  const [, id, child] = segments;
  const places = snapshot.places || [];
  if (segments.length === 1) {
    validateParams(params, ["q", "limit", "offset"]);
    const q = fold(params.get("q") || "");
    return page(snapshot, params, "/api/v1/places", "places",
      places.filter(p => !q || fold(`${p.name} ${p.id}`).includes(q)).map(placeView));
  }
  const place = places.find(p => p.id === id);
  if (!place) throw new ApiError(404, "Place not found.");
  if (segments.length === 2) {
    validateParams(params, []);
    return { revision: snapshot.revision, ...placeView(place) };
  }
  if (segments.length !== 3) throw new ApiError(404, "Endpoint not found.");
  const path = `/api/v1/places/${encodeURIComponent(id)}/${child}`;
  if (["features", "infrastructure"].includes(child)) {
    const ids = new Set([...place.sourceFeatureIds, ...place.associations.map(a => a.featureId)]);
    const features = snapshot.features.filter(f => ids.has(f.id) &&
      (child !== "infrastructure" || f.properties.collections.some(c => infrastructureCollections.has(c))));
    return { ...queryFeatures({ ...snapshot, features }, params, undefined, path),
      placeId: id, associationPolicy: "Explicit registry/source associations only; not inferred proximity or administrative containment.",
      associations: place.associations };
  }
  if (child === "datasets") {
    validateParams(params, ["limit", "offset"]);
    const matched = snapshot.datasets.filter(d => d.placeIds?.includes(id) || d.records?.some(r => r.placeId === id));
    return page(snapshot, params, path, "datasets", datasetCatalog({ ...snapshot, datasets: matched }), {
      placeId: id, status: matched.length ? "available" : "no-records",
      caveats: ["Only explicit place links. Island or national totals are not locality observations; see /api/v1/datasets for broader context."],
    });
  }
  throw new ApiError(404, "Endpoint not found.");
}
function queryRecords(snapshot, dataset, params) {
  const filters = ["year", "geographicScope", "locality", "placeId", "indicator", "sourceId", "referencePeriod"];
  validateParams(params, [...filters, "limit", "offset"]);
  const year = params.has("year") ? integer(params, "year", null, 1, 9999) : null;
  if (params.has("placeId") && !snapshot.places.some(p => p.id === params.get("placeId"))) throw new ApiError(404, "Place not found.");
  const rows = (dataset.records || []).filter(r => filters.every(key =>
    !params.has(key) || (key === "year" ? r.year === year : r[key] === params.get(key))));
  return page(snapshot, params, `/api/v1/datasets/${dataset.id}/records`, "records",
    [...rows].sort((a,b) => a.id.localeCompare(b.id)), {
      datasetId: dataset.id, status: dataset.recordsStatus || "planned", sourceIds: dataset.sourceIds || [],
      updatedAt: dataset.updatedAt ?? null, retrievedAt: dataset.retrievedAt ?? null, caveats: dataset.caveats || [],
    });
}
const transportResources = ["routes", "schedules", "arrivals", "departures"];
function resolveTransport(snapshot, segments, params) {
  const metadata = { status: "planned", sourceIds: [], updatedAt: null, retrievedAt: null,
    caveats: ["No reliable operational transport feed is connected. Empty results do not mean no service. Historical statistics remain in /api/v1/datasets/transport-2025; infrastructure remains in /api/v1/collections/transport."],
  };
  if (segments.length === 1) {
    validateParams(params, []);
    return { revision: snapshot.revision, ...metadata, modes: ["air", "maritime"],
      links: Object.fromEntries(transportResources.map(key => [key, `/api/v1/transport/${key}`])) };
  }
  const resource = segments[1];
  if (segments.length !== 2 || !transportResources.includes(resource)) throw new ApiError(404, "Endpoint not found.");
  validateParams(params, ["limit", "offset", "mode", "origin", "destination", "operatorId", "date"]);
  if (params.has("mode") && !["air", "maritime"].includes(params.get("mode"))) fail("mode must be air or maritime.");
  if (params.has("date")) {
    const date = params.get("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) fail("date must be a valid YYYY-MM-DD date.");
  }
  return page(snapshot, params, `/api/v1/transport/${resource}`, resource, [], metadata);
}

function parseInstant(value, name) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || +match[2] > 23 || +match[3] > 59 || +match[4] > 59 ||
      !Number.isFinite(Date.parse(value)) || new Date(`${match[1]}T00:00:00Z`).toISOString().slice(0,10) !== match[1])
    fail(`${name} must be a valid RFC 3339 timestamp with timezone.`);
  return Date.parse(value);
}
function resolveEnvironment(snapshot, segments, params) {
  const resource = segments[0];
  const records = snapshot[resource] || [];
  if (segments.length === 2) {
    validateParams(params, []);
    const item = records.find(row => row.id === segments[1]);
    if (!item) throw new ApiError(404, resource === "sensors" ? "Sensor not found." : "Observation not found.");
    return { ...item, revision: snapshot.revision };
  }
  if (segments.length !== 1) throw new ApiError(404, "Endpoint not found.");
  validateParams(params, ["featureId", "sensorId", "parameter", "from", "to", "bbox", "limit", "offset"]);
  const from = params.has("from") ? parseInstant(params.get("from"), "from") : null;
  const to = params.has("to") ? parseInstant(params.get("to"), "to") : null;
  if (from !== null && to !== null && from > to) fail("from must not be later than to.");
  let bounds = null;
  if (params.has("bbox")) {
    // Reuse geographic validation; do not paginate the spatial match before filtering.
    queryFeatures({ ...snapshot, features: [] }, new URLSearchParams({ bbox: params.get("bbox") }));
    bounds = params.get("bbox").split(",").map(Number);
  }
  const inBounds = row => {
    if (!bounds) return true;
    if (row.geometry?.type !== "Point") return false;
    const [x,y] = row.geometry.coordinates;
    return x >= bounds[0] && x <= bounds[2] && y >= bounds[1] && y <= bounds[3];
  };
  const observationMatches = row =>
    (!params.has("featureId") || row.featureId === params.get("featureId")) &&
    (!params.has("sensorId") || row.sensorId === params.get("sensorId")) &&
    (!params.has("parameter") || row.parameter === params.get("parameter")) &&
    (from === null || Date.parse(row.observedAt) >= from) &&
    (to === null || Date.parse(row.observedAt) <= to);
  const matching = records.filter(row => {
    if (!inBounds(row)) return false;
    if (resource === "observations") return observationMatches(row);
    if (params.has("featureId") && row.featureId !== params.get("featureId")) return false;
    if (params.has("sensorId") && row.id !== params.get("sensorId")) return false;
    if (params.has("parameter") && !row.parameters.includes(params.get("parameter"))) return false;
    return (from === null && to === null) || (snapshot.observations || []).some(o => o.sensorId === row.id && observationMatches(o));
  }).sort((a,b) => a.id.localeCompare(b.id));
  return page(snapshot, params, `/api/v1/${resource}`, resource, matching, {
    status: records.length ? "available" : "planned",
    mode: "snapshot", sourceIds: [...new Set(records.flatMap(r => r.sourceIds || [r.sourceId]).filter(Boolean))],
    caveats: resource === "observations"
      ? ["Model estimates are explicitly distinguished from measured observations. No automatic refresh. Inspect observedAt/validAt and retrievedAt; missing values are omitted, never converted to zero."]
      : ["Only registered physical sensors belong here. No physical sensors are currently registered; model providers are sources, not sensors. Time filters match sensors with observations in the inclusive interval."],
  });
}

export function resolveApi(snapshot, segments, params) {
  if (segments[0] === "astronomy") return resolveAstronomy(snapshot, segments, params, (status,message) => new ApiError(status,message));
  if (segments[0] === "night-sky" && segments[1] === "constellations" && segments.length === 2) return queryConstellations(params, message => new ApiError(400, message));
  if (segments[0] === "night-sky" && segments.length === 1) return queryNightSky(params, message => new ApiError(400, message));
  if (["observations", "sensors"].includes(segments[0])) return resolveEnvironment(snapshot, segments, params);
  if (segments[0] === "observation-parameters" && segments.length === 1) {
    validateParams(params, []);
    return { revision: snapshot.revision, parameters: environmentalParameters.map(p => ({ ...p, status: snapshot.observations?.some(o => o.parameter === p.id) ? "available" : "planned" })) };
  }
  if (segments[0] === "places") return resolvePlaces(snapshot, segments, params);
  if (segments[0] === "transport") return resolveTransport(snapshot, segments, params);
  if (segments[0] === "agriculture" || (segments[0] === "geo" && segments[1] === "agriculture")) {
    const geoAlias = segments[0] === "geo";
    const resource = geoAlias ? "areas" : segments[1];
    if ((!geoAlias && segments.length === 1) || resource === "overview") {
      validateParams(params, []);
      return { revision: snapshot.revision, status: "available", geographicScope: "island:maio", sourceId: snapshot.agriculture.sourceId,
        featureCount: snapshot.features.filter(f => f.properties.collections.includes("agriculture")).length,
        classificationCount: snapshot.agriculture.classifications.length,
        cultivatedArea: {
          irrigatedHectaresCalculated: snapshot.agriculture.classifications.find(x => x.classificationId === "regadio")?.areaHectaresCalculated ?? null,
          rainFedHectaresCalculated: snapshot.agriculture.classifications.find(x => x.classificationId === "sequeiro")?.areaHectaresCalculated ?? null,
        },
        methodology: snapshot.agriculture.methodology,
        caveats: ["Mapped classifications describe the source layer; they are not current production, crop, yield or farm statistics."],
        links: { self: "/api/v1/agriculture", landUse: "/api/v1/agriculture/land-use", areas: "/api/v1/agriculture/areas", geo: "/api/v1/geo/agriculture", source: `/api/v1/sources/${snapshot.agriculture.sourceId}` } };
    }
    if (!geoAlias && resource === "land-use" && segments.length === 2) {
      validateParams(params, []);
      return { revision: snapshot.revision, status: "available", sourceId: snapshot.agriculture.sourceId,
        methodology: snapshot.agriculture.methodology, classifications: snapshot.agriculture.classifications,
        links: { self: "/api/v1/agriculture/land-use", areas: "/api/v1/agriculture/areas" } };
    }
    if ((geoAlias && segments.length === 2) || (!geoAlias && resource === "areas" && segments.length === 2))
      return queryFeatures(snapshot, params, "agriculture", geoAlias ? "/api/v1/geo/agriculture" : "/api/v1/agriculture/areas");
  }
  const [resource, id, child] = segments;
  if (resource === "catalog" && segments.length === 1) {
    validateParams(params, []);
    return interoperabilityCatalog(snapshot);
  }
  if (resource === "sources" && segments.length === 2) {
    validateParams(params, []);
    const source = snapshot.sources.find(s => s.id === id);
    if (!source) throw new ApiError(404, "Source not found.");
    return { revision: snapshot.revision, ...describeSource(snapshot, source) };
  }
  if (!resource)
    return {
      name: "Maio Open API",
      version: snapshot.version,
      revision: snapshot.revision,
      description: "A shared digital representation of Maio, Cabo Verde.",
      mode: "read-only snapshots and calculated astronomy",
      authentication: "none",
      extent: snapshot.extent,
      links: {
        astronomy: "/api/v1/astronomy",
        agriculture: "/api/v1/agriculture",
        nightSky: "/api/v1/night-sky",
        catalog: "/api/v1/catalog",
        collections: "/api/v1/collections",
        features: "/api/v1/features",
        datasets: "/api/v1/datasets",
        sources: "/api/v1/sources",
        places: "/api/v1/places",
        transport: "/api/v1/transport",
        observations: "/api/v1/observations",
        sensors: "/api/v1/sensors",
        observationParameters: "/api/v1/observation-parameters",
        openapi: "/api/v1/openapi.json",
        health: "/api/v1/health",
      },
    };
  if (resource === "health" && segments.length === 1)
    return {
      status: "ok",
      revision: snapshot.revision,
      features: snapshot.features.length,
      datasets: snapshot.datasets.length,
      mode: "snapshot",
      liveSensorsConnected: false,
    };
  if (resource === "sources" && segments.length === 1)
    return {
      revision: snapshot.revision,
      sources: snapshot.sources.map(s => describeSource(snapshot, s)),
      notice:
        "Public access does not grant new reuse rights. Preserve OSM attribution and ODbL obligations. Consult each source license and provenance status before reuse; unspecified rights remain unspecified.",
    };
  if (resource === "collections") {
    if (segments.length === 1)
      return { revision: snapshot.revision, collections: catalog(snapshot) };
    const c = catalog(snapshot).find((c) => c.id === id);
    if (!c) throw new ApiError(404, "Collection not found.");
    if (segments.length === 2)
      return {
        ...c,
        extent: snapshot.extent,
        crs: "OGC:CRS84",
        revision: snapshot.revision,
      };
    if (child === "items" && segments.length === 3)
      return queryFeatures(
        snapshot,
        params,
        id,
        `/api/v1/collections/${id}/items`,
      );
  }
  if (resource === "features") {
    if (segments.length === 1) return queryFeatures(snapshot, params);
    if (segments.length === 2) {
      const f = snapshot.features.find((f) => f.id === id);
      if (!f) throw new ApiError(404, "Feature not found.");
      return f;
    }
  }
  if (resource === "datasets") {
    if (segments.length === 1)
      return {
        revision: snapshot.revision,
        datasets: datasetCatalog(snapshot),
      };
    if (segments.length === 3 && child === "records") {
      const d = snapshot.datasets.find(d => d.id === id);
      if (!d) throw new ApiError(404, "Dataset not found.");
      return queryRecords(snapshot, d, params);
    }
    if (segments.length === 2) {
      const d = snapshot.datasets.find((d) => d.id === id);
      if (!d) throw new ApiError(404, "Dataset not found.");
      return { revision: snapshot.revision, ...d, links: datasetCatalog({datasets:[d]})[0].links };
    }
  }
  throw new ApiError(
    404,
    "Endpoint not found. See /api/v1 for available endpoints.",
  );
}
export function jsonResponse(
  body,
  request,
  revision,
  status = 200,
  geo = false,
) {
  const text = JSON.stringify(body);
  const etag = `"${createHash("sha256").update(text).digest("hex").slice(0, 24)}"`;
  const headers = {
    ...cors,
    "Content-Type": geo
      ? "application/geo+json; charset=utf-8"
      : "application/json; charset=utf-8",
    "Cache-Control":
      status === 200
        ? "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
        : "no-store",
    "X-Data-Revision": revision,
    ETag: etag,
  };
  const tags = (request.headers.get("if-none-match") || "")
    .split(",")
    .map((t) => t.trim().replace(/^W\//, ""));
  if (status === 200 && (tags.includes(etag) || tags.includes("*")))
    return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : text, {
    status,
    headers,
  });
}
