import { constellationCatalog } from "../lib/constellations.mjs";
import { nightSkyModel } from "../lib/night-sky.mjs";
import { sourceContract } from "../lib/interoperability.mjs";
import { normalizeINE, applyINE } from "../lib/ine/importer.mjs";
import { normalizeEnvironment, providers } from "../lib/environment.mjs";
import { additionalCollections, datasetDefinitions, extendMemberships, buildPlaces } from "../lib/v11-data.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const read = async (file) =>
  JSON.parse(await readFile(path.join(root, file), "utf8"));
const extent = [-23.3, 15.05, -23.02, 15.4];
const collections = [
  ["roads", "Roads", "Temporarily withdrawn pending source-data review. Existing feature IDs are retained for compatibility."],
  ["trails", "Trails", "Mapped paths, tracks and hiking routes."],
  ["beaches", "Beaches", "Coastal beaches and curated beach assets."],
  [
    "protected-areas",
    "Protected areas",
    "Mapped conservation areas; not a legal boundary survey.",
  ],
  [
    "businesses",
    "Businesses",
    "Mapped shops, food, accommodation and local economic activity.",
  ],
  [
    "public-infrastructure",
    "Public infrastructure",
    "Schools, healthcare, civic and religious facilities.",
  ],
  [
    "water-points",
    "Water points",
    "Explicitly mapped wells, drinking-water points and water infrastructure.",
  ],
  [
    "sports",
    "Sports infrastructure",
    "Mapped sports facilities and explicitly planned sports sites.",
  ],
  ["tourism", "Tourism assets", "Curated heritage and visitor assets."],
  ["transport", "Transport", "Main island gateways: Maio Airport and Porto Inglês. Bus stops are excluded pending verification; the airport terminal is part of the airport."],
  [
    "hydrology",
    "Hydrology",
    "Water bodies and waterways; these are not drinking-water points.",
  ],
  ["natural-features", "Natural features", "Landforms and natural habitats."],
  ["agriculture", "Agriculture", "INGT Carta Agrícola polygons for Maio, with source classifications and calculated geodesic area."],
  ["settlements", "Settlements", "Towns and villages."],
  [
    "zoning",
    "Planning zones",
    "Planning records, including records awaiting geometry.",
  ],
  [
    "observations",
    "Environmental observations",
    "Timestamped environmental records; current coverage is model estimates, not physical sensor readings.",
  ],
  [
    "sensors",
    "Live sensors",
    "Reserved for registered sensors; no live feed is connected.",
  ],
].map(([id, title, description]) => ({ id, title, description }));
collections.push(...additionalCollections);
const sources = [],
  features = new Map();
const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
function positions(value, out = []) {
  if (!Array.isArray(value)) return out;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  )
    out.push(value);
  else value.forEach((item) => positions(item, out));
  return out;
}
function geometryInfo(g) {
  const pts = positions(g?.coordinates);
  if (
    !pts.length ||
    pts.some(
      (p) =>
        !Number.isFinite(p[0]) ||
        !Number.isFinite(p[1]) ||
        Math.abs(p[0]) > 180 ||
        Math.abs(p[1]) > 90,
    )
  )
    return { geometry: null };
  const xs = pts.map((p) => p[0]),
    ys = pts.map((p) => p[1]);
  return {
    geometry: g,
    bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
  };
}
const intersects = (a, b) =>
  a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
function add(
  raw,
  source,
  categories,
  curated = false,
  namespace = source.id,
  prefer = false,
) {
  const p = raw.properties || {},
    info = geometryInfo(raw.geometry);
  if (info.bbox && !intersects(info.bbox, extent)) {
    source.excludedOutsideExtent++;
    return;
  }
  if (!categories.length) return;
  const sourceId = raw.id || p["@id"] || p.osm_id || p.id;
  const osm = !curated && /^(node|way|relation)\//.test(String(sourceId));
  const id = osm
    ? `osm-${String(sourceId).replace("/", "-")}`
    : `${namespace}-${sourceId || digest({ name: p.name, geometry: raw.geometry }).slice(0, 16)}`;
  const existing = features.get(id);
  if (existing) {
    existing.properties.collections = [
      ...new Set([...existing.properties.collections, ...categories]),
    ].sort();
    existing.properties.sourceIds = [
      ...new Set([...existing.properties.sourceIds, source.id]),
    ];
    if (prefer) {
      existing.properties.attributes = {
        ...existing.properties.attributes,
        ...p,
      };
      existing.properties.name = p.name || p.title || existing.properties.name;
      existing.properties.preferredSourceId = source.id;
      if (info.geometry) {
        Object.assign(existing, info);
        existing.properties.geometryStatus = "available";
        existing.properties.geometrySourceId = source.id;
      }
    }
    return;
  }
  const name = p.name || p.title || p.afia_name;
  features.set(id, {
    type: "Feature",
    id,
    ...info,
    properties: {
      name: name || null,
      collections: [...new Set(categories)].sort(),
      sourceIds: [source.id],
      sourceRecordId: sourceId || null,
      preferredSourceId: source.id,
      geometrySourceId: info.geometry ? source.id : null,
      geometryStatus: info.geometry ? "available" : "missing",
      recordType: curated ? "curated-asset" : "mapped-feature",
      attributes: p,
    },
  });
}
function classify(p) {
  const c = [];
  if (
    p.shop ||
    [
      "restaurant",
      "cafe",
      "bar",
      "marketplace",
      "fast_food",
      "bank",
      "fuel",
    ].includes(p.amenity) ||
    ["hotel", "guest_house", "apartment", "hostel", "camp_site"].includes(
      p.tourism,
    )
  )
    c.push("businesses");
  if (
    [
      "school",
      "hospital",
      "clinic",
      "doctors",
      "police",
      "fire_station",
      "townhall",
      "post_office",
      "place_of_worship",
      "community_centre",
      "library",
    ].includes(p.amenity)
  )
    c.push("public-infrastructure");
  if (
    ["drinking_water", "water_point", "fountain"].includes(p.amenity) ||
    ["water_well", "water_tap", "water_tower", "reservoir_covered"].includes(
      p.man_made,
    )
  )
    c.push("water-points");
  if (
    p.sport ||
    ["pitch", "stadium", "sports_centre", "swimming_pool"].includes(p.leisure)
  )
    c.push("sports");
  if (p.tourism || p.historic) c.push("tourism");
  if (
    p.aeroway ||
    p.public_transport ||
    p.harbour ||
    p.amenity === "ferry_terminal" ||
    ["bus_stop", "platform"].includes(p.highway)
  )
    c.push("transport");
  return c;
}
const layers = [
  [
    "transport_network",
    "Transport network",
    (p) =>
      ["bus_stop", "platform"].includes(p.highway)
        ? ["transport"]
        : ["path", "footway", "track", "cycleway", "bridleway", "steps"].includes(
        p.highway,
      )
        ? ["trails"]
        : p.highway
          ? ["roads"]
          : ["transport"],
  ],
  ["trilhas_osm", "Mapped trails", () => ["trails"]],
  ["beaches_osm", "Beaches", () => ["beaches"]],
  ["protected_areas", "Protected areas", () => ["protected-areas"]],
  ["hydrology", "Hydrology", () => ["hydrology"]],
  [
    "natural_features",
    "Natural features",
    (p) => (p.natural === "beach" ? ["beaches"] : ["natural-features"]),
  ],
  ["settlements", "Settlements", () => ["settlements"]],
  ["zoning_special", "Planning zones", () => ["zoning"]],
  ["places_osm_raw", "OpenStreetMap places", classify],
];
for (const [id, title, categories] of layers) {
  const file = `public/data/${id}.geojson`,
    data = await read(file);
  const source = {
    id,
    title,
    file,
    attribution:
      data.copyright || "AFIA / MaioAzul; source details retained on records",
    license: data.copyright
      ? "ODbL-1.0 (OpenStreetMap); enriched text may have separate rights"
      : "Not specified by source",
    licenseUrl: data.copyright
      ? "https://opendatacommons.org/licenses/odbl/1-0/"
      : null,
    sourceUpdatedAt: data.timestamp || null,
    checksum: digest(data),
    excludedOutsideExtent: 0,
  };
  sources.push(source);
  data.features.forEach((f) => add(f, source, categories(f.properties || {})));
}
const placeFile = "public/data/maio_places_with_coords.json",
  places = await read(placeFile);
const placeSource = {
  id: "visit-maio",
  title: "Visit Maio curated places",
  file: placeFile,
  attribution: "AFIA / Visit Maio / MaioAzul",
  license: "Not specified by source",
  licenseUrl: null,
  sourceUpdatedAt: null,
  checksum: digest(places),
  excludedOutsideExtent: 0,
};
sources.push(placeSource);
const categoryMap = {
  beach: "beaches",
  protected_area: "protected-areas",
  biosphere_reserve: "protected-areas",
  biosphere: "protected-areas",
  settlement: "settlements",
  economic_activity: "businesses",
  education_center: "public-infrastructure",
  ribeira: "hydrology",
  wetland: "hydrology",
  mountain: "natural-features",
  forest_area: "natural-features",
  dunes: "natural-features",
  islet: "natural-features",
};
places.forEach((p) =>
  add(
    {
      id: p.id,
      properties: p,
      geometry: p.coordinates
        ? { type: "Point", coordinates: p.coordinates }
        : null,
    },
    placeSource,
    [categoryMap[p.category] || "tourism", "tourism"],
    true,
  ),
);
// Guide is the preferred editorial edition for shared curated place IDs.
// Keep root-only places and both source IDs; never match distinct places by name.
const guidePlacesFile = "apps/guide/public/data/maio_places_with_coords.json";
const guidePlaces = await read(guidePlacesFile);
const guidePlacesSource = {
  ...placeSource,
  id: "guide-places",
  title: "Maio Guide curated places",
  file: guidePlacesFile,
  attribution: "AFIA / Maio Guide / MaioAzul",
  checksum: digest(guidePlaces),
  excludedOutsideExtent: 0,
};
sources.push(guidePlacesSource);
for (const p of guidePlaces)
  add(
    {
      id: p.id,
      properties: p,
      geometry: p.coordinates
        ? { type: "Point", coordinates: p.coordinates }
        : null,
    },
    guidePlacesSource,
    [categoryMap[p.category] || "tourism", "tourism"],
    true,
    "visit-maio",
    true,
  );

// Keep editorial plans separate from existing beach records and their operational status.
const sportsFile = "apps/maio-api/data/planned-sports.json";
const sportsPlans = await read(sportsFile);
const sportsSource = {
  id: "planned-sports", title: "MaioAzul planned sports sites", file: sportsFile,
  attribution: "MaioAzul editorial plans; locations from Visit Maio / Maio Guide",
  license: "Not specified by source", licenseUrl: null,
  sourceUpdatedAt: "2026-09-17", checksum: digest(sportsPlans), excludedOutsideExtent: 0,
};
sources.push(sportsSource);
for (const plan of sportsPlans) {
  const location = features.get(plan.locationFeatureId);
  if (!location?.geometry) throw new Error(`Missing sports location: ${plan.locationFeatureId}`);
  add({ id: plan.id, geometry: location.geometry, properties: plan }, sportsSource, ["sports"], true);
  const feature = features.get(`planned-sports-${plan.id}`);
  feature.properties.lifecycleStatus = plan.lifecycleStatus;
  feature.properties.geometrySourceId = location.properties.geometrySourceId;
  feature.properties.sourceIds = [sportsSource.id, ...location.properties.sourceIds];
}

const surveyFile = "apps/guide/public/data/maio_offroad_trail_2026.geojson";
const survey = await read(surveyFile);
const surveySource = {
  id: "guide-offroad",
  title: "Maio Offroad 2026 field survey",
  file: surveyFile,
  attribution: "QField field survey / Maio Guide",
  license: "Not specified by source",
  licenseUrl: null,
  sourceUpdatedAt: null,
  checksum: digest(survey),
  excludedOutsideExtent: 0,
};
sources.push(surveySource);
for (const f of survey.features)
  add(f, surveySource, ["trails", "tourism"], true);

const guideSettlementsFile = "apps/guide/public/data/settlements.geojson";
const guideSettlements = await read(guideSettlementsFile);
const guideSettlementsSource = {
  ...sources.find((s) => s.id === "settlements"),
  id: "guide-settlements",
  title: "Maio Guide settlements",
  file: guideSettlementsFile,
  checksum: digest(guideSettlements),
  excludedOutsideExtent: 0,
};
sources.push(guideSettlementsSource);
for (const f of guideSettlements.features)
  add(
    f,
    guideSettlementsSource,
    ["settlements"],
    false,
    "guide-settlements",
    true,
  );
// Explicit allowlist: public editorial fields only, never operational Guide databases.
const guideFile = "apps/guide/public/data/experience_places_by_slug.json",
  guide = await read(guideFile);
const guideSource = {
  id: "maio-guide",
  title: "Maio Guide experiences",
  file: guideFile,
  attribution: "Maio Guide editorial directory",
  license: "Not specified by source",
  licenseUrl: null,
  sourceUpdatedAt: null,
  checksum: digest(guide),
  excludedOutsideExtent: 0,
};
sources.push(guideSource);
for (const group of guide)
  for (const p of group.places || []) {
    const attributes = Object.fromEntries(
      ["id", "title", "description", "location", "source_url"]
        .filter((k) => p[k] != null)
        .map((k) => [k, p[k]]),
    );
    attributes.experience = group.slug;
    add(
      { id: p.id, properties: attributes, geometry: null },
      guideSource,
      [
        "tourism",
        ...(["food", "stay"].includes(group.slug) ? ["businesses"] : []),
      ],
      true,
    );
  }
const datasetSpecs = [
  ["energy", "Maio energy", "data/energy/maio_energy_core_data.json", "Maio"],
  [
    "tourism-2025",
    "Tourism · 2025",
    "data/tourism/ine_tourism_2025.json",
    "Cabo Verde, including Maio",
  ],
  [
    "tourism-2026",
    "Tourism · 2026 Q1–Q2",
    "data/tourism/ine_tourism_2026.json",
    "Cabo Verde, including Maio",
  ],
  [
    "transport-2025",
    "Transport · 2025",
    "data/transport/cabo_verde_transportes_2025.json",
    "Cabo Verde, including Maio",
  ],
  [
    "payments",
    "Payment infrastructure",
    "public/data/payment-system-2019-2023.json",
    "Cabo Verde, including Maio",
  ],
  [
    "external-sector",
    "External sector · 2025",
    "public/data/external-sector-bcv-2025.json",
    "Cabo Verde (national context)",
  ],
];
const datasets = [];
for (const [id, title, file, scope] of datasetSpecs) {
  const payload = await read(file);
  datasets.push({
    id,
    title,
    file,
    scope,
    license: "Not specified by source",
    checksum: digest(payload),
    source: payload.source ||
      payload.sources ||
      payload.meta || { attribution: "See payload sources and notes" },
    payload,
  });
}
// Preserve legacy payloads; normalized indicator access is additive.
for (const dataset of datasets) {
  const sourceId = `dataset-${dataset.id}`;
  Object.assign(dataset, { status: "available", sourceIds: [sourceId],
    sourceUpdatedAt: dataset.payload.as_of_date || null, updatedAt: dataset.payload.as_of_date || null,
    retrievedAt: null, recordsStatus: "planned", records: [],
    caveats: ["Original source payload retained. Normalized indicator records are not yet connected; consult payload units, periods and source notes."] });
  sources.push({ id: sourceId, title: dataset.title, file: dataset.file,
    attribution: "See dataset source metadata and payload", license: dataset.license,
    licenseUrl: null, sourceUpdatedAt: dataset.sourceUpdatedAt, checksum: dataset.checksum,
    excludedOutsideExtent: 0 });
}
datasets.push(...datasetDefinitions.map(d => ({ ...d })));
// Existing dashboard population is not a verified INE publication import.
const populationExport = await read("apps/maio-api/data/dashboard-population.json");
const populationSourceId = "dashboard-population";
const populationCaveats = [
  "Existing dashboard database record; the dashboard attributes population to INE Cabo Verde, but no publication URL or table reference is stored.",
  "Year is the dashboard's stored reference year. This is not verified RGPH 2021 data; census versus estimate/projection is unknown.",
  "databaseUpdatedAt is a database update timestamp, not an INE publication date. Island total is not locality-level population.",
];
sources.push({ id: populationSourceId, title: "Maio dashboard population", file: "apps/maio-api/data/dashboard-population.json",
  attribution: "Maio dashboard; attributed there to INE Cabo Verde (publication unverified)",
  license: "Not specified by source", licenseUrl: null, sourceUpdatedAt: null,
  retrievedAt: populationExport.retrievedAt, checksum: digest(populationExport), excludedOutsideExtent: 0 });
const populationDataset = datasets.find(d => d.id === "population");
const populationYears = new Set();
populationDataset.records = populationExport.records.map(row => {
  if (!Number.isInteger(row.year) || !Number.isSafeInteger(row.population) || row.population < 0 || populationYears.has(row.year) || row.ilha.toLowerCase() !== "maio")
    throw new Error("Invalid dashboard population source record");
  populationYears.add(row.year);
  return { id: `dashboard-population-maio-${row.year}`, year: row.year, geographicScope: "island:maio", locality: null, placeId: null,
    indicator: "resident-population", value: row.population, valueStatus: "reported", unit: "residents", dimensions: {},
    sourceId: populationSourceId, sourceRecordId: row.sourceRecordId, referencePeriod: String(row.year),
    updatedAt: null, databaseUpdatedAt: row.databaseUpdatedAt, retrievedAt: populationExport.retrievedAt,
    quality: "needs_review", caveats: populationCaveats };
});
Object.assign(populationDataset, { status: populationDataset.records.length ? "available" : "no-records",
  recordsStatus: populationDataset.records.length ? "available" : "no-records", sourceIds: [populationSourceId],
  retrievedAt: populationExport.retrievedAt, caveats: populationCaveats, payload: { records: populationDataset.records } });
populationDataset.checksum = digest(populationDataset.payload);
// Allowlist public budget summary values; exclude local workstation paths and unrelated tables.
const budget = datasets.find(d => d.id === "municipal-budget");
for (const year of [2025, 2026]) {
  const file = `public/data/municipal-budget-ingestion/maio-${year}/maio_budget_${year}.first_pass.json`;
  const raw = await read(file), doc = raw.source_document, summary = raw.budget_summary;
  const sourceId = doc.id;
  sources.push({ id: sourceId, title: doc.title, file,
    attribution: doc.issuing_body, license: "Not specified by source", licenseUrl: null,
    sourceUpdatedAt: doc.publication_date || null, checksum: digest(raw), excludedOutsideExtent: 0 });
  budget.sourceIds.push(sourceId);
  for (const [indicator, value] of Object.entries(summary)) {
    if (!indicator.endsWith("_cve") || typeof value !== "number" || !Number.isFinite(value)) continue;
    budget.records.push({ id: `${sourceId}-${indicator}`, year: doc.budget_year,
      geographicScope: "municipality:maio", locality: null, placeId: null, indicator,
      value, unit: "CVE", sourceId, sourceRecordId: `${summary.id}/${indicator}`,
      referencePeriod: String(doc.budget_year), updatedAt: doc.publication_date || null,
      retrievedAt: null, quality: doc.review_status || "unreviewed",
      caveats: ["First-pass extraction awaiting review; approved budget, not actual expenditure.", summary.notes, ...(doc.ingestion_notes || [])].filter(Boolean) });
  }
}
budget.status = budget.records.length ? "available" : "no-records";
budget.recordsStatus = budget.status;
budget.caveats = ["First-pass public budget summaries awaiting review. Appropriations are not execution or procurement statistics. Unknown retrieval times remain null."];
budget.payload = { records: budget.records };
budget.checksum = digest(budget.payload);
// Statistical features deliberately have null geometry: never imply company locations.
const business = await read("apps/maio-api/data/business-statistics.json");
sources.push(business.source);
collections.push({ id: "business-statistics", title: "Business statistics", description: "Maio IAE 2024 aggregate survey estimates, not individual businesses. Null geometry; source cells and original units retained." });
const businessDataset = datasets.find(d => d.id === "business-demography");
Object.assign(businessDataset, { title: "Business statistics · IAE 2024", status: "available", recordsStatus: "available",
  sourceIds: [business.source.id], retrievedAt: business.source.retrievedAt,
  records: business.records, caveats: business.caveats, methodology: business.methodology,
  payload: { records: business.records }, checksum: digest(business.records) });
for (const record of business.records) {
  const id = record.id;
  features.set(id, { type: "Feature", id, geometry: null, properties: {
    name: record.displayName, displayName: record.displayName, collections: ["business-statistics"],
    sourceIds: [record.sourceId], sourceRecordId: record.sourceRecordId, preferredSourceId: record.sourceId,
    geometrySourceId: null, geometryStatus: "missing", recordType: "aggregate-statistic",
    attributes: { ...record, datasetId: "business-demography", datasetRecordId: id },
  } });
}
const agriculture = await read("apps/maio-api/data/ingt-agriculture-maio.json");
const agricultureSource = { ...agriculture.source, file: "apps/maio-api/data/ingt-agriculture-maio.json", excludedOutsideExtent: 0 };
sources.push(agricultureSource);
for (const feature of agriculture.features) {
  add({ ...feature, id: feature.properties.sourceRecordId }, agricultureSource, ["agriculture"], false, agricultureSource.id);
}
datasets.push({
  id: "agriculture-land-use", title: "Maio agricultural land-use classifications", scope: "island:maio",
  status: "available", recordsStatus: "available", sourceIds: [agricultureSource.id],
  license: agricultureSource.license, sourceUpdatedAt: null, updatedAt: null,
  retrievedAt: agricultureSource.retrievedAt, methodology: agriculture.methodology,
  caveats: [agriculture.methodology.areaFieldAssessment, agriculture.methodology.overlapCaveat, "The source layer provides no reference date, crop, yield, farm count or production values."],
  records: agriculture.classifications.map(row => ({
    id: `ingt-carta-agricola-maio-${row.classificationId}`, year: null,
    geographicScope: "island:maio", locality: null, placeId: null,
    indicator: "mapped-area-by-agricultural-classification", value: row.areaHectaresCalculated,
    valueStatus: "calculated", unit: "ha", dimensions: { classificationId: row.classificationId, classification: row.classification, featureCount: row.featureCount },
    sourceId: agricultureSource.id, sourceRecordId: `layer-5/classification/${row.classificationId}`,
    referencePeriod: null, updatedAt: null, retrievedAt: agricultureSource.retrievedAt,
    caveats: [agriculture.methodology.calculatedAreaMethod, agriculture.methodology.overlapCaveat],
  })),
  payload: { methodology: agriculture.methodology, classifications: agriculture.classifications },
  checksum: digest({ methodology: agriculture.methodology, classifications: agriculture.classifications }),
});
for (const feature of features.values()) extendMemberships(feature);
const placeRegistry = await read("apps/maio-api/data/place-registry.json");
// Only explicitly registered, validated local publication packages enter the API.
const ineImports = await read("apps/maio-api/data/ine/imports.json");
if (!Array.isArray(ineImports) || new Set(ineImports).size !== ineImports.length)
  throw new Error("Invalid INE import registry");
for (const file of ineImports) {
  if (typeof file !== "string" || !/^ine-[a-z0-9-]+\.json$/.test(file)) throw new Error("Invalid INE package filename");
  const input = await read(`apps/maio-api/data/ine/${file}`);
  if (`${input.source?.id}.json` !== file) throw new Error("INE package/source ID mismatch");
  applyINE(normalizeINE(input, placeRegistry), { sources, datasets, features, registry: placeRegistry });
}
const placesIndex = buildPlaces(placeRegistry, [...features.values()], sources);

const environmentBundle = await read("apps/maio-api/data/environment-source.json");
const environmentalObservations = normalizeEnvironment(environmentBundle);
for (const entry of environmentBundle.entries) {
  const provider = providers.find(p => p.id === entry.sourceId);
  const source = { id: provider.id, title: provider.id, file: "apps/maio-api/data/environment-source.json",
    url: entry.url, documentationUrl: provider.docs, attribution: provider.attribution,
    license: "CC-BY-4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    sourceUpdatedAt: null, retrievedAt: entry.retrievedAt, checksum: digest(entry.payload), excludedOutsideExtent: 0 };
  sources.push(source);
  for (const observation of environmentalObservations.filter(o => o.sourceId === source.id)) {
    add({ id: observation.id, geometry: observation.geometry,
      properties: { ...observation, name: observation.parameter, observationId: observation.id } }, source, ["observations"], true, "observations");
  }
}

for (const feature of features.values()) {
  if (!feature.properties.collections.includes("beaches")) continue;
  const name = feature.properties.name;
  const candidates = typeof name === "string" ? [name] : [name?.pt, name?.en];
  const sourceName = candidates.find(value => typeof value === "string" && value.trim());
  // Editorial publication policy: omit unnamed beach records from the API.
  // Keep shared source files intact; a sourced name can qualify a future import.
  if (!sourceName) {
    features.delete(feature.id);
    continue;
  }
  feature.properties.displayName = sourceName.trim();
  feature.properties.nameStatus = "sourced";
}
for (const feature of features.values()) {
  if (feature.properties.collections.includes("roads")) feature.properties.publicationStatus = "withdrawn";
}
// Publish only reviewed gateway assets; preserve previous detail URLs.
const portBundle = await read("apps/maio-api/data/transport-assets.json");
const portSource = { ...portBundle.source, checksum: digest(portBundle.feature), file: "apps/maio-api/data/transport-assets.json" };
sources.push(portSource);
add(portBundle.feature, portSource, ["transport"], true, "enapor");
const portGeometrySource = { ...portBundle.geometrySource, checksum: digest(portBundle.feature.geometry), file: "apps/maio-api/data/transport-assets.json" };
sources.push(portGeometrySource);
const portFeature = features.get("enapor-porto-ingles");
portFeature.properties.sourceIds.push(portGeometrySource.id);
portFeature.properties.geometrySourceId = portGeometrySource.id;
const airportId = "osm-way-400062197";
const terminalId = "osm-way-172092807";
for (const feature of features.values()) {
  if (!feature.properties.collections.includes("transport")) continue;
  if ([airportId, "enapor-porto-ingles"].includes(feature.id)) continue;
  feature.properties.publicationStatus = "withdrawn";
  feature.properties.publicationReason = feature.id === terminalId
    ? "Airport component; published under Maio Airport, not a separate gateway."
    : "Outside current gateway-only scope; unverified transport stop retained for compatibility.";
  if (feature.id === terminalId) feature.properties.attributes.parentFeatureId = airportId;
}
features.get(airportId).properties.attributes.componentFeatureIds = [terminalId];
const all = [...features.values()].sort((a, b) => a.id.localeCompare(b.id));
sources.push({ id: constellationCatalog.sourceId, title: "d3-celestial constellation reference catalogue", url: constellationCatalog.url, file: "apps/maio-api/data/constellation-catalog.json", attribution: constellationCatalog.attribution, license: "BSD-3-Clause (d3-celestial distribution; upstream credits retained)", licenseUrl: `${constellationCatalog.url.replace("/tree/", "/blob/")}/LICENSE`, sourceUpdatedAt: null, retrievedAt: constellationCatalog.retrievedAt, checksum: digest(constellationCatalog.checksums), upstreamCommit: constellationCatalog.commit });
sources.push({ id: "astronomy-engine", title: "Astronomy Engine calculated ephemerides", url: nightSkyModel.url, attribution: nightSkyModel.attribution, license: "MIT (calculation software)", licenseUrl: "https://github.com/cosinekitty/astronomy/blob/master/LICENSE", sourceUpdatedAt: null, retrievedAt: null, checksum: digest(nightSkyModel), modelVersion: nightSkyModel.version });
for (let i = 0; i < sources.length; i++) sources[i] = sourceContract(sources[i], datasets);
const snapshot = {
  version: "1.1.0",
  revision: digest({
    sources,
    collections,
    features: all,
    datasets,
    places: placesIndex,
    observations: environmentalObservations,
    agriculture: { sourceId: agricultureSource.id, methodology: agriculture.methodology, classifications: agriculture.classifications },
    version: "1.1.0",
  }).slice(0, 16),
  extent,
  sources,
  collections: collections.map((c) => ({
    ...c,
    count: all.filter((f) => f.properties.publicationStatus !== "withdrawn" && f.properties.collections.includes(c.id)).length,
    ...(c.id === "roads" ? { publicationStatus: "withdrawn", caveats: ["Temporarily withdrawn pending source-data review. Feature detail URLs remain for compatibility; do not use these records as verified roads."] } : {}),
    status: (["sensors", "roads"].includes(c.id) || (c.id === "observations" && !environmentalObservations.length) || (additionalCollections.some(x => x.id === c.id) && !all.some(f => f.properties.collections.includes(c.id))))
      ? "planned"
      : all.some((f) => f.properties.collections.includes(c.id))
        ? "available"
        : "no-records",
  })),
  features: all,
  places: placesIndex,
  observations: environmentalObservations,
  agriculture: { sourceId: agricultureSource.id, methodology: agriculture.methodology, classifications: agriculture.classifications },
  sensors: [],
  datasets,
};
await writeFile(
  path.resolve(here, "../data/snapshot.json"),
  JSON.stringify(snapshot),
);
console.log(
  `Synced ${all.length} features, ${datasets.length} datasets. Revision ${snapshot.revision}`,
);
console.table(
  snapshot.collections.map(({ id, count, status }) => ({ id, count, status })),
);
