import fs from "fs";
import path from "path";

/* =========================
   Types
========================= */

type GeoJSONFeature = {
  type: "Feature";
  id?: string;
  properties: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
};

type GeoJSON = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

/* =========================
   Paths
========================= */

const INPUT = path.join("public", "data", "beaches_osm.geojson");
const OUTPUT = path.join("public", "data", "beaches_osm_patched.geojson");

/* =========================
   Load
========================= */

const raw = fs.readFileSync(INPUT, "utf8");
const geojson = JSON.parse(raw) as GeoJSON;

/* =========================
   Patch
========================= */

geojson.features = geojson.features.map((feature) => {
  const props = feature.properties || {};
  const osmId = props["@id"] || feature.id || null;

  return {
    ...feature,
    properties: {
      ...props,

      // OSM
      osm_id: osmId,

      // AFIA-managed fields
      afia_name: props.afia_name ?? null,
      afia_group: props.afia_group ?? null,
      afia_confidence: props.afia_confidence ?? null,
      afia_source: props.afia_source ?? "AFIA / MaioAzul",
    },
  };
});

/* =========================
   Save
========================= */

fs.writeFileSync(
  OUTPUT,
  JSON.stringify(geojson, null, 2),
  "utf8"
);

console.log("✅ beaches_osm_patched.geojson created");
