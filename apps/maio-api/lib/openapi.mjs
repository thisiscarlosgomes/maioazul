import { astronomyOpenapi } from "./openapi-astronomy.mjs";
import { constellationOpenapi } from "./openapi-constellations.mjs";
import { nightSkyOpenapi } from "./openapi-night-sky.mjs";
import { strengthenContracts } from "./openapi-contracts.mjs";
import { extendOpenapi } from "./openapi-v11.mjs";
import { agricultureOpenapi } from "./openapi-agriculture.mjs";
export function openapi(snapshot) {
  const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
  const parameter = (name, description, schema, where = "query") => ({
    name,
    in: where,
    required: where === "path",
    description,
    schema,
  });
  const filters = [
    parameter("sourceId", "Exact provenance source ID. Follow /sources/{sourceId} for origin, transformations and refresh metadata.", { type: "string" }),
    parameter("collection", "Filter by collection ID.", {
      type: "string",
      enum: snapshot.collections.map((c) => c.id),
    }),
    parameter(
      "q",
      "Case- and accent-insensitive text search over source attributes.",
      { type: "string", maxLength: 200 },
    ),
    parameter(
      "bbox",
      "Feature-envelope overlap: west,south,east,north (longitude,latitude). Does not perform exact geometry intersection. No antimeridian wrapping.",
      { type: "string", example: "-23.25,15.10,-23.10,15.25" },
    ),
    parameter("geometry", "Only mapped or unmapped records.", {
      type: "string",
      enum: ["available", "missing"],
    }),
    parameter("limit", "Page size.", {
      type: "integer",
      minimum: 1,
      maximum: 500,
      default: 100,
    }),
    parameter("offset", "Zero-based offset in stable ID order.", {
      type: "integer",
      minimum: 0,
      default: 0,
    }),
  ];
  const operation = (
    operationId,
    summary,
    schema,
    parameters = [],
    geo = false,
  ) => ({
    get: {
      operationId,
      summary,
      parameters,
      responses: {
        200: {
          description: "Success",
          content: {
            [geo ? "application/geo+json" : "application/json"]: { schema },
          },
        },
        304: { description: "Unchanged; ETag matches If-None-Match." },
        400: {
          description: "Invalid query",
          content: { "application/json": { schema: ref("Error") } },
        },
        404: {
          description: "Not found",
          content: { "application/json": { schema: ref("Error") } },
        },
      },
    },
  });
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Maio Open API",
      version: "1.0.0",
      description:
        "Public read-only snapshots of Maio geographic assets and dashboard datasets. No API key. WGS84 longitude/latitude. OSM-derived records retain ODbL obligations; unspecified source rights are not relicensed. Environmental records may include explicitly labeled model estimates; physical sensor registration is currently planned. Source timestamps may be unknown; revision identifies source content, not observation time.",
    },
    servers: [{ url: "/api/v1" }],
    security: [],
    paths: {
      "/": operation("getApi", "API discovery", { type: "object" }),
      "/health": operation("getHealth", "Snapshot health", { type: "object" }),
      "/sources": operation(
        "listSources",
        "Source provenance, timestamps, checksums and licensing",
        { type: "object" },
      ),
      "/collections": operation(
        "listCollections",
        "List available and planned collections",
        {
          type: "object",
          properties: {
            revision: { type: "string" },
            collections: { type: "array", items: ref("Collection") },
          },
        },
      ),
      "/collections/{collectionId}": operation(
        "getCollection",
        "Collection metadata",
        ref("Collection"),
        [
          parameter(
            "collectionId",
            "Collection ID",
            { type: "string" },
            "path",
          ),
        ],
      ),
      "/collections/{collectionId}/items": operation(
        "getCollectionItems",
        "Paginated GeoJSON collection",
        ref("FeatureCollection"),
        [
          parameter(
            "collectionId",
            "Collection ID",
            { type: "string" },
            "path",
          ),
          ...filters.filter((p) => p.name !== "collection"),
        ],
        true,
      ),
      "/features": operation(
        "listFeatures",
        "Search features across collections",
        ref("FeatureCollection"),
        filters,
        true,
      ),
      "/features/{featureId}": operation(
        "getFeature",
        "Get a stable feature ID",
        ref("Feature"),
        [
          parameter(
            "featureId",
            "ID from a feature listing; OSM IDs use osm-way-123 format.",
            { type: "string" },
            "path",
          ),
        ],
        true,
      ),
      "/datasets": operation("listDatasets", "Dashboard dataset metadata", {
        type: "object",
      }),
      "/datasets/{datasetId}": operation(
        "getDataset",
        "Full source dataset, including units, scope and caveats",
        { type: "object" },
        [
          parameter(
            "datasetId",
            "Dataset ID",
            { type: "string", enum: snapshot.datasets.map((d) => d.id) },
            "path",
          ),
        ],
      ),
      "/openapi.json": operation("getOpenApi", "This OpenAPI document", {
        type: "object",
      }),
    },
    components: {
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["status", "message"],
              properties: {
                status: { type: "integer" },
                message: { type: "string" },
              },
            },
          },
        },
        Collection: {
          type: "object",
          required: ["id", "title", "description", "count", "status"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            count: { type: "integer" },
            status: {
              type: "string",
              enum: ["available", "no-records", "planned"],
            },
            links: { type: "object" },
          },
        },
        Feature: {
          type: "object",
          required: ["type", "id", "geometry", "properties"],
          properties: {
            type: { const: "Feature" },
            id: { type: "string" },
            bbox: {
              type: "array",
              items: { type: "number" },
              minItems: 4,
              maxItems: 4,
            },
            geometry: {
              oneOf: [
                { type: "null" },
                {
                  type: "object",
                  required: ["type", "coordinates"],
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "Point",
                        "MultiPoint",
                        "LineString",
                        "MultiLineString",
                        "Polygon",
                        "MultiPolygon",
                      ],
                    },
                    coordinates: { type: "array" },
                  },
                },
              ],
            },
            properties: {
              type: "object",
              required: [
                "name",
                "collections",
                "sourceIds",
                "geometryStatus",
                "attributes",
              ],
              properties: {
                name: {
                  oneOf: [
                    { type: "string" },
                    { type: "object" },
                    { type: "null" },
                  ],
                },
                displayName: {
                  type: "string",
                  description: "Present on beaches. Source name as a string, preferring Portuguese then English. Unnamed beach records are excluded from publication. Original name remains unchanged.",
                },
                nameStatus: { type: "string", enum: ["sourced", "missing"] },
                collections: { type: "array", items: { type: "string" } },
                sourceIds: { type: "array", items: { type: "string" } },
                sourceRecordId: { type: ["string", "number", "null"] },
                geometryStatus: {
                  type: "string",
                  enum: ["available", "missing"],
                },
                lifecycleStatus: {
                  type: "string", enum: ["planned"],
                  description: "Explicit editorial lifecycle status when known. Omission does not imply operational status. Independent of collection data availability.",
                },
                recordType: { type: "string" },
                attributes: { type: "object", additionalProperties: true },
              },
            },
          },
        },
        FeatureCollection: {
          type: "object",
          required: [
            "type",
            "features",
            "numberMatched",
            "numberReturned",
            "links",
          ],
          properties: {
            type: { const: "FeatureCollection" },
            features: { type: "array", items: ref("Feature") },
            revision: { type: "string" },
            numberMatched: { type: "integer" },
            numberReturned: { type: "integer" },
            limit: { type: "integer" },
            offset: { type: "integer" },
            links: {
              type: "object",
              properties: {
                self: { type: "string" },
                next: { type: ["string", "null"] },
                previous: { type: ["string", "null"] },
              },
            },
          },
        },
        Observation: {
          description:
            "Future ingestion contract; no observations are currently connected.",
          type: "object",
          required: [
            "id",
            "observedAt",
            "sourceId",
            "parameter",
            "value",
            "unit",
            "featureId",
          ],
          properties: {
            id: { type: "string" },
            observedAt: { type: "string", format: "date-time" },
            sourceId: { type: "string" },
            sensorId: { type: ["string", "null"] },
            featureId: { type: "string" },
            parameter: { type: "string" },
            value: { type: "number" },
            unit: { type: "string" },
            quality: {
              type: "string",
              enum: ["unverified", "validated", "rejected"],
            },
          },
        },
      },
    },
  };
  return strengthenContracts(agricultureOpenapi(astronomyOpenapi(constellationOpenapi(nightSkyOpenapi(extendOpenapi(spec, { operation, parameter, filters }))))));
}
