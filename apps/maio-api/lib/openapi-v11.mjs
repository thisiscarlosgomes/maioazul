const ref = name => ({ $ref: `#/components/schemas/${name}` });
const text = { type: "string" };
const nullableText = { type: ["string", "null"] };
const strings = { type: "array", items: text };
const timestamp = { type: ["string", "null"], description: "Source timestamp (date or RFC 3339 date-time); null when unknown. Never inferred from API request time." };
const instant = { type: ["string", "null"], format: "date-time" };
const object = (properties, required = Object.keys(properties)) => ({ type: "object", required, properties });
const status = { type: "string", enum: ["available", "planned", "no-records"] };
const pagination = {
  revision: text, numberMatched: { type: "integer", minimum: 0 }, numberReturned: { type: "integer", minimum: 0 },
  limit: { type: "integer", minimum: 1, maximum: 500 }, offset: { type: "integer", minimum: 0 },
  links: object({ self: text, next: nullableText, previous: nullableText }),
};
const feed = { status, sourceIds: strings, updatedAt: timestamp, retrievedAt: timestamp, caveats: strings };
const paginated = (key, item, extra = {}) => object({ ...pagination, ...extra, [key]: { type: "array", items: ref(item) } });
export function extendOpenapi(spec, { operation, parameter, filters }) {
  spec.info.version = "1.1.0";
  spec.info.description += " V1.1 is additive under /api/v1. New domains without source data explicitly return planned status. Place associations are explicit, not inferred from proximity. Planned datasets have payload:null; available legacy dataset payloads retain their original structure. Collection availability is independent of asset lifecycle.";
  const pageParams = filters.filter(p => ["limit", "offset"].includes(p.name));
  const placeParam = parameter("placeId", "Stable ID returned by /places (for example calheta). IDs are pinned in the source registry; names may change independently.", text, "path");
  const datasetParam = parameter("datasetId", "ID from /datasets.", text, "path");
  Object.assign(spec.paths, {
    "/places": operation("listPlaces", "Discover stable locality entities", ref("PlacePage"), [parameter("q", "Case- and accent-insensitive place name/ID search.", { type: "string", maxLength: 200 }), ...pageParams]),
    "/places/{placeId}": operation("getPlace", "Place identity, source geometry and related-data links", ref("Place"), [placeParam]),
    "/places/{placeId}/features": operation("getPlaceFeatures", "Explicitly associated source features; not a containment query", ref("PlaceFeatureCollection"), [placeParam, ...filters], true),
    "/places/{placeId}/infrastructure": operation("getPlaceInfrastructure", "Explicitly associated public infrastructure", ref("PlaceFeatureCollection"), [placeParam, ...filters], true),
    "/places/{placeId}/datasets": operation("getPlaceDatasets", "Datasets with explicit locality links; excludes inferred island totals", ref("PlaceDatasetPage"), [placeParam, ...pageParams]),
    "/datasets/{datasetId}/records": operation("getDatasetRecords", "Normalized indicators where connected; planned otherwise. Legacy payloads remain at dataset detail.", ref("DatasetRecordPage"), [datasetParam, ...pageParams,
      parameter("year", "Exact reference year", { type: "integer", minimum: 1, maximum: 9999 }),
      ...["geographicScope", "locality", "placeId", "indicator", "sourceId", "referencePeriod"].map(name => parameter(name, "Exact source/registry value; filters combine with AND.", { type: "string", maxLength: 200 })),
    ]),
    "/transport": operation("getTransport", "Transport capabilities; operational feeds currently planned", ref("TransportDomain")),
  });
  for (const key of ["routes", "schedules", "arrivals", "departures"]) {
    const schema = `${key[0].toUpperCase()}${key.slice(1)}Page`;
    spec.paths[`/transport/${key}`] = operation(`listTransport${key[0].toUpperCase()}${key.slice(1)}`, `Planned transport ${key}; no connected operational feed`, ref(schema), [
      ...pageParams, parameter("mode", "Transport mode", { type: "string", enum: ["air", "maritime"] }),
      ...["origin", "destination", "operatorId"].map(name => parameter(name, "Exact endpoint/operator ID when feeds are connected.", { type: "string", maxLength: 200 })),
      parameter("date", "Service date YYYY-MM-DD in the schedule's declared timezone; not request time.", { type: "string", format: "date" }),
    ]);
  }
  const schemas = spec.components.schemas;
  Object.assign(schemas, {
    Geometry: schemas.Feature.properties.geometry,
    Place: object({ id: text, name: text, type: { type: "string", enum: ["locality", "locality-group", "settlement"] },
      geometry: ref("Geometry"), geometrySourceFeatureId: text, sourceIds: strings, sourceFeatureIds: strings,
      sourceTimestamps: { type: "array", items: object({ sourceId: text, updatedAt: timestamp }) }, caveats: strings,
      links: object({ self: text, features: text, datasets: text, infrastructure: text }),
    }),
    PlacePage: paginated("places", "Place"),
    PlaceFeatureCollection: { allOf: [ref("FeatureCollection"), object({ placeId: text, associationPolicy: text,
      associations: { type: "array", items: object({ featureId: text, basis: text }) } })] },
    Dataset: object({ id: text, title: text, scope: text, status, sourceIds: strings,
      sourceUpdatedAt: timestamp, updatedAt: timestamp, retrievedAt: timestamp, license: text,
      recordsStatus: status, caveats: strings, payload: { description: "Original legacy payload, normalized new payload, or null for planned data. Omitted from catalogs." },
    }, ["id", "title", "scope", "status", "sourceIds", "license", "recordsStatus", "caveats"]),
    DatasetCatalog: object({ revision: text, datasets: { type: "array", items: ref("Dataset") } }),
    PlaceDatasetPage: paginated("datasets", "Dataset", { placeId: text, status, caveats: strings }),
    DatasetRecord: object({ id: text, year: { type: ["integer", "null"], minimum: 1, maximum: 9999 },
      geographicScope: text, locality: nullableText, placeId: nullableText, indicator: text,
      value: { type: ["number", "string", "boolean", "null"], description: "Sourced value; null means missing, not zero." },
      unit: nullableText, sourceId: text, sourceRecordId: text, referencePeriod: text,
      updatedAt: timestamp, retrievedAt: timestamp, quality: text, caveats: strings,
    }),
    DatasetRecordPage: paginated("records", "DatasetRecord", { datasetId: text, ...feed }),
    TransportDomain: object({ revision: text, ...feed, modes: { type: "array", items: { enum: ["air", "maritime"] } },
      links: object({ routes: text, schedules: text, arrivals: text, departures: text }) }),
    TransportEndpoint: object({ id: text, name: text, placeId: nullableText, featureId: nullableText,
      code: nullableText, codeSystem: nullableText }, ["id", "name"]),
    TransportOperator: object({ id: text, name: text, sourceIds: strings }),
    TransportRoute: object({ id: text, mode: { enum: ["air", "maritime"] },
      origin: ref("TransportEndpoint"), destination: ref("TransportEndpoint"), operator: ref("TransportOperator"),
      sourceId: text, sourceRecordId: text, updatedAt: timestamp, retrievedAt: timestamp, caveats: strings,
    }),
    TransportSchedule: object({ id: text, routeId: text, mode: { enum: ["air", "maritime"] },
      operator: ref("TransportOperator"), serviceNumber: nullableText,
      origin: ref("TransportEndpoint"), destination: ref("TransportEndpoint"),
      serviceDate: { type: "string", format: "date" }, timezone: { type: "string", description: "IANA timezone supplied by source." },
      scheduledDeparture: instant, scheduledArrival: instant, actualDeparture: instant, actualArrival: instant,
      status: { type: "string", enum: ["unknown", "scheduled", "delayed", "cancelled", "departed", "arrived"] },
      sourceStatus: nullableText, sourceId: text, sourceRecordId: text, updatedAt: timestamp, retrievedAt: timestamp, caveats: strings,
    }),
    RoutesPage: paginated("routes", "TransportRoute", feed),
    SchedulesPage: paginated("schedules", "TransportSchedule", feed),
    ArrivalsPage: paginated("arrivals", "TransportSchedule", feed),
    DeparturesPage: paginated("departures", "TransportSchedule", feed),
  });
  spec.paths["/datasets"].get.responses[200].content["application/json"].schema = ref("DatasetCatalog");
  spec.paths["/datasets/{datasetId}"].get.responses[200].content["application/json"].schema = ref("Dataset");
  schemas.WorkbookCell = object({ sheet: text, cell: { type: "string", pattern: "^[A-Z]+[1-9][0-9]*$" }, numberFormat: text,
    rawValue: { type: ["number", "string", "null"], description: "Original cell value, including missing markers; not a normalized zero." } });
  Object.assign(schemas.DatasetRecord.properties, {
    sourceCell: ref("WorkbookCell"),
    displayName: text,
    geographicCode: { type: "string", description: "Original authoritative geographic code; leading zeroes preserved. Linked to Places only through an explicitly reviewed crosswalk." },
    valueStatus: { type: "string", enum: ["reported", "missing", "suppressed", "not-applicable"] },
    dimensions: { type: "object", additionalProperties: { type: "string" }, description: "Source-defined disaggregation codes/labels; do not sum overlapping totals or dimensions." },
  });
  const environmentalFilters = [
    ...["featureId", "sensorId", "parameter"].map(name => parameter(name, "Exact ID. Unknown filters return an empty list; unknown detail IDs return 404.", { type: "string", maxLength: 200 })),
    ...["from", "to"].map(name => parameter(name, "Inclusive observedAt boundary; RFC 3339 with timezone. For sensors, requires a matching observation in this interval.", { type: "string", format: "date-time" })),
    filters.find(p => p.name === "bbox"), ...pageParams,
  ];
  Object.assign(spec.paths, {
    "/observations": operation("listObservations", "Sourced environmental records; model estimates are labeled explicitly", ref("ObservationPage"), [...environmentalFilters]),
    "/observations/{observationId}": operation("getObservation", "Observation by stable source/parameter/time ID", ref("Observation"), [parameter("observationId", "ID from /observations", text, "path")]),
    "/sensors": operation("listSensors", "Registered physical sensors; currently planned", ref("SensorPage"), [...environmentalFilters]),
    "/sensors/{sensorId}": operation("getSensor", "Registered sensor by stable ID", ref("Sensor"), [parameter("sensorId", "ID from /sensors", text, "path")]),
    "/observation-parameters": operation("listObservationParameters", "Weather, ocean, water, energy and air parameter capabilities", object({ revision: text, parameters: { type: "array", items: ref("EnvironmentalParameter") } })),
  });
  Object.assign(schemas.Observation.properties, {
    featureId: { ...nullableText, description: "Linked physical feature if known; null for a model grid point without an asset link." },
    observationKind: { enum: ["measured", "model-estimate", "forecast"], description: "Never treat modeled output as a physical measurement." },
    validAt: { type: "string", format: "date-time", description: "Model valid time. For model estimates observedAt retains this time for compatibility; it is not a sensor measurement time." },
    sourceRecordId: text, geometry: object({ type: { const: "Point" }, coordinates: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 } }),
    retrievedAt: instant, updatedAt: instant, intervalSeconds: { type: ["number", "null"], minimum: 0 },
    caveats: strings,
    measurementContext: object({ heightMetres: { type: ["number", "null"] }, depthMetres: { type: ["number", "null"] },
      verticalDatum: nullableText, directionConvention: nullableText, aggregation: nullableText,
      periodStart: instant, periodEnd: instant }, []),
  });
  schemas.Observation.description = "Sourced environmental value. Existing required fields are retained. V1.1 records add provenance, retrieval time, geometry and model/measurement distinction. Missing upstream values are omitted, not zeros. No physical sensors are currently connected.";
  Object.assign(schemas, {
    EnvironmentalParameter: object({ id: text, domain: { enum: ["weather", "ocean", "water", "energy", "air"] }, unit: text, description: text, status }),
    Sensor: object({ id: text, name: text, type: { const: "physical-sensor" }, featureId: nullableText,
      geometry: schemas.Observation.properties.geometry, parameters: strings, sourceIds: strings, sourceRecordId: text,
      status: { enum: ["active", "inactive", "unknown", "decommissioned"] },
      installedAt: instant, lastObservedAt: instant, updatedAt: instant, retrievedAt: instant,
      license: text, caveats: strings,
      calibration: object({ calibratedAt: instant, nextCalibrationAt: instant, method: nullableText }, []),
    }, ["id", "name", "type", "geometry", "parameters", "sourceIds", "status"]),
    ObservationPage: paginated("observations", "Observation", { status, mode: { const: "snapshot" }, sourceIds: strings, caveats: strings }),
    SensorPage: paginated("sensors", "Sensor", { status, mode: { const: "snapshot" }, sourceIds: strings, caveats: strings }),
  });

  schemas.Dataset.properties.links = object({ self: text, records: text, sources: strings });
  Object.assign(schemas, {
    SourceContract: object({
      id: text, title: text, attribution: text, license: text,
      licenseUrl: nullableText, sourceUpdatedAt: timestamp, checksum: text,
      upstreamUrls: { type: "array", items: { type: "string", format: "uri" } },
      classification: { enum: ["reference-catalog", "calculation-model", "model-provider", "community-map", "reviewed-official-publication", "secondary-extract", "editorial"] },
      provenanceStatus: { enum: ["reviewed", "needs-review", "linked-source", "publication-link-missing"] },
      delivery: { enum: ["materialized-snapshot", "on-demand-calculation"] },
      refresh: object({ automatic: { const: false }, method: text, command: text, retrievedAt: timestamp,
        sourceUpdatedAt: timestamp, freshnessAssessment: { const: "not-assessed" }, note: text }),
      transformation: object({ implementation: text, description: text }),
      links: object({ self: text, features: text, collections: strings, datasets: strings }),
    }),
    SourceCatalog: object({revision:text,sources:{type:"array",items:ref("SourceContract")},notice:text}),
    InteroperabilityCatalog: object({ revision:text,role:{const:"public-data-interoperability-layer"},delivery:{const:"materialized-snapshot"},principle:text,limitations:strings,
      collections:{type:"array",items:{type:"object"}},datasets:{type:"array",items:{type:"object"}},sources:{type:"array",items:ref("SourceContract")},links:{type:"object"} }),
  });
  spec.paths["/catalog"] = operation("getInteroperabilityCatalog", "Discover collections, datasets and source contracts together", ref("InteroperabilityCatalog"));
  spec.paths["/sources/{sourceId}"] = operation("getSource", "Source origin, provenance, transformation, refresh and dependent resources", ref("SourceContract"), [parameter("sourceId", "Stable source ID from records or catalogs", text, "path")]);
  spec.paths["/sources"].get.responses[200].content["application/json"].schema = ref("SourceCatalog");
  for (const path of Object.values(spec.paths)) {
    path.get.parameters.push(parameter("If-None-Match", "ETag from a previous response.", text, "header"));
    path.get.responses[200].headers = {
      ETag: { schema: text, description: "Content-derived validator." },
      "X-Data-Revision": { schema: text, description: "Snapshot content revision." },
      "Access-Control-Allow-Origin": { schema: { const: "*" }, description: "Anonymous public reads." },
    };
    path.get.responses[405] = { description: "Read-only API. Writes are not accepted." };
  }
  return spec;
}
