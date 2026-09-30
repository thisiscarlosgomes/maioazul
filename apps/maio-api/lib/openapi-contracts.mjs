const ref = name => ({ $ref: `#/components/schemas/${name}` });
const array = (items, minItems) => ({ type: "array", items, minItems });

// Reusable JSON Schema 2020-12 contracts; response data is not rewritten.
export function strengthenContracts(spec) {
  const schemas = spec.components.schemas;
  schemas.SourceTimestamp = {
    description: "ISO 8601 calendar date or RFC 3339 instant with timezone; null when the source date is unknown.",
    anyOf: [{ type: "string", format: "date" }, { type: "string", format: "date-time" }, { type: "null" }],
  };
  schemas.ResourceId = { type: "string", pattern: "^[A-Za-z0-9._~-]+$", description: "Stable URL-safe public identifier. Original source identifiers are preserved separately." };
  schemas.Position = { type: "array", minItems: 2, maxItems: 3,
    prefixItems: [{ type: "number", minimum: -180, maximum: 180 }, { type: "number", minimum: -90, maximum: 90 }, { type: "number" }], items: false };
  schemas.LinearRing = { ...array(ref("Position"), 4), description: "Closed ring: first and last positions must be identical. Longitude, latitude, optional altitude; WGS84." };
  const coordinates = {
    Point: ref("Position"), MultiPoint: array(ref("Position"), 1),
    LineString: array(ref("Position"), 2), MultiLineString: array(array(ref("Position"), 2), 1),
    Polygon: array(ref("LinearRing"), 1), MultiPolygon: array(array(ref("LinearRing"), 1), 1),
  };
  for (const [type, shape] of Object.entries(coordinates)) {
    schemas[type] = { type: "object", required: ["type", "coordinates"], properties: { type: { const: type }, coordinates: shape } };
  }
  schemas.Geometry = { description: "RFC 7946 geometry in WGS84 longitude/latitude. Null means geometry is unavailable.", oneOf: [{ type: "null" }, ...Object.keys(coordinates).map(ref)] };
  schemas.Feature.properties.geometry = ref("Geometry");
  schemas.Feature.properties.properties.properties.publicationStatus = { const: "withdrawn", description: "Retained detail record only; excluded from public listings pending review." };
  schemas.Collection.properties.publicationStatus = { const: "withdrawn" };
  schemas.FeatureCollection.properties.publicationStatus = { const: "withdrawn" };
  schemas.Observation.properties.geometry = ref("Point");
  schemas.Sensor.properties.geometry = ref("Point");
  schemas.PaginationLinks = { type: "object", required: ["self", "next", "previous"], properties: {
    self: { type: "string" }, next: { type: ["string", "null"] }, previous: { type: ["string", "null"] },
  }, description: "Links preserve filters. Null next/previous means no adjacent page. Offsets are stable within a revision; restart paging if X-Data-Revision changes." };
  // Upgrade source timestamps throughout nested contracts, retaining unknowns.
  function visit(value) {
    if (!value || typeof value !== "object") return;
    if (value.properties) for (const [key, child] of Object.entries(value.properties)) {
      if (["sourceUpdatedAt", "updatedAt", "retrievedAt"].includes(key)) value.properties[key] = ref("SourceTimestamp");
      else if (key === "id") value.properties[key] = ref("ResourceId");
      else if (key === "links" && child.properties?.next) value.properties[key] = ref("PaginationLinks");
    }
    for (const child of Object.values(value)) visit(child);
  }
  Object.values(schemas).forEach(visit);
  for (const path of Object.values(spec.paths)) {
    const operation = path.get;
    for (const code of [405, 500]) operation.responses[code] = {
      description: code === 405 ? "Read-only API. Writes are not accepted." : "Unable to read snapshot.",
      content: { "application/json": { schema: ref("Error") } },
      ...(code === 405 ? { headers: { Allow: { schema: { type: "string" } } } } : {}),
    };
    operation.responses[304].headers = operation.responses[200].headers;
    // Every successful response has a named reusable component for client generation.
    for (const media of Object.values(operation.responses[200].content)) if (!media.schema.$ref) {
      const name = `${operation.operationId[0].toUpperCase()}${operation.operationId.slice(1)}Response`;
      schemas[name] = media.schema;
      media.schema = ref(name);
    }
  }
  return spec;
}
