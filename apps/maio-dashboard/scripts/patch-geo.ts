import fs from "fs";
import path from "path";

/* =========================
   Paths
========================= */

const PLACES = path.join("public", "data", "maio_places_full.json");
const OSM = path.join("public", "data", "places_osm_raw.geojson");
const OUTPUT = path.join("public", "data", "maio_places_with_coords.json");

/* =========================
   Load
========================= */

const places = JSON.parse(fs.readFileSync(PLACES, "utf8"));
const osm = JSON.parse(fs.readFileSync(OSM, "utf8"));

/* =========================
   Index OSM by name
========================= */

const osmIndex = new Map<string, any>();

for (const f of osm.features) {
  const name = f.properties?.name;
  if (!name) continue;

  const coords =
    f.geometry.type === "Point"
      ? f.geometry.coordinates
      : f.geometry.coordinates
      ? f.geometry.coordinates
      : f.geometry.center;

  if (coords) {
    osmIndex.set(name.toLowerCase(), {
      coordinates: coords,
      osm_id: f.properties["@id"] || f.id,
    });
  }
}

/* =========================
   Patch places
========================= */

const enriched = places.map((place: any) => {
  const key =
    place.name?.pt?.toLowerCase() ||
    place.name?.en?.toLowerCase() ||
    null;

  const match = key ? osmIndex.get(key) : null;

  return {
    ...place,
    coordinates: match ? match.coordinates : null,
    osm_id: match ? match.osm_id : null,
    geo_source: match ? "OSM" : "missing",
  };
});

/* =========================
   Save
========================= */

fs.writeFileSync(OUTPUT, JSON.stringify(enriched, null, 2), "utf8");

console.log("✅ maio_places_with_coords.json created");
