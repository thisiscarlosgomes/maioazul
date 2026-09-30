import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  queryFeatures,
  resolveApi,
  jsonResponse,
  ApiError,
} from "../lib/api.mjs";
import { openapi } from "../lib/openapi.mjs";
const snapshot = JSON.parse(
  await readFile(new URL("../data/snapshot.json", import.meta.url), "utf8"),
);
const query = (q = "", collection) =>
  queryFeatures(snapshot, new URLSearchParams(q), collection);
test("snapshot has unique stable IDs and valid provenance", () => {
  assert.equal(
    new Set(snapshot.features.map((f) => f.id)).size,
    snapshot.features.length,
  );
  const sources = new Set(snapshot.sources.map((s) => s.id));
  for (const f of snapshot.features) {
    assert.ok(f.id);
    assert.ok(f.properties.sourceIds.every((s) => sources.has(s)));
    assert.equal(
      f.properties.geometryStatus,
      f.geometry ? "available" : "missing",
    );
    if (f.bbox)
      assert.ok(
        f.bbox[0] <= snapshot.extent[2] &&
          f.bbox[2] >= snapshot.extent[0] &&
          f.bbox[1] <= snapshot.extent[3] &&
          f.bbox[3] >= snapshot.extent[1],
      );
  }
  for (const c of snapshot.collections)
    assert.equal(
      c.count,
      snapshot.features.filter((f) => f.properties.publicationStatus !== "withdrawn" && f.properties.collections.includes(c.id))
        .length,
    );
});
test("pagination visits every beach once and preserves filters in links", () => {
  let url = "/api/v1/features?collection=beaches&limit=7",
    ids = [];
  while (url) {
    const page = query(new URL(url, "https://maio.test").search);
    ids.push(...page.features.map((f) => f.id));
    assert.equal(page.numberReturned, page.features.length);
    url = page.links.next;
    if (url) assert.match(url, /collection=beaches/);
  }
  assert.equal(
    ids.length,
    snapshot.collections.find((c) => c.id === "beaches").count,
  );
  assert.equal(new Set(ids).size, ids.length);
});
test("search is accent-insensitive and accepts geographic filters", () => {
  assert.deepEqual(
    query("q=Inglês").features.map((f) => f.id),
    query("q=ingles").features.map((f) => f.id),
  );
  assert.ok(query("q=ingles").numberMatched > 0);
  const all = query("bbox=-23.30,15.05,-23.02,15.40&limit=500");
  assert.ok(all.features.every((f) => f.geometry));
  assert.equal(query("bbox=0,0,1,1").numberMatched, 0);
  assert.ok(query("geometry=missing").numberMatched > 0);
  assert.equal(
    query("geometry=missing&bbox=-23.30,15.05,-23.02,15.40").numberMatched,
    0,
  );
});
test("strict query validation rejects unsafe or ambiguous inputs", () => {
  for (const q of [
    "limit=0",
    "limit=501",
    "limit=1.5",
    "limit=NaN",
    "offset=-1",
    "offset=9007199254740992",
    "bbox=1,2,3",
    "bbox=,1,2,3",
    "bbox=3,1,2,4",
    "bbox=-181,1,2,4",
    "bbox=1,2,Infinity,4",
    "geometry=invalid",
    "limti=10",
    "limit=1&limit=2",
    `q=${"x".repeat(201)}`,
  ])
    assert.throws(
      () => query(q),
      (e) => e instanceof ApiError && e.status === 400,
      q,
    );
  assert.throws(
    () => query("collection=roads", "beaches"),
    (e) => e.status === 400,
  );
  assert.throws(
    () => query("collection=not-real"),
    (e) => e.status === 404,
  );
});
test("empty collections honestly distinguish planned feeds from coverage gaps", () => {
  for (const id of ["sensors", "water-points"])
    assert.equal(query("", id).numberMatched, 0);
  assert.equal(
    snapshot.collections.find((c) => c.id === "sensors").status,
    "planned",
  );
  assert.equal(
    snapshot.collections.find((c) => c.id === "water-points").status,
    "no-records",
  );
  assert.equal(
    resolveApi(snapshot, ["health"], new URLSearchParams())
      .liveSensorsConnected,
    false,
  );
});
test("feature lookup, dataset scope and unknown paths", () => {
  const f = snapshot.features[0];
  assert.equal(
    resolveApi(snapshot, ["features", f.id], new URLSearchParams()).id,
    f.id,
  );
  const d = resolveApi(
    snapshot,
    ["datasets", "tourism-2026"],
    new URLSearchParams(),
  );
  assert.match(d.title, /Q1–Q2/);
  assert.ok(d.payload.meta.notes.length);
  assert.equal(
    resolveApi(snapshot, ["datasets"], new URLSearchParams()).datasets[0]
      .payload,
    undefined,
  );
  for (const path of [
    ["features", "unknown"],
    ["collections", "unknown"],
    ["collections", "roads", "items", "extra"],
    ["datasets", "unknown"],
    ["health", "extra"],
  ])
    assert.throws(
      () => resolveApi(snapshot, path, new URLSearchParams()),
      (e) => e.status === 404,
    );
});
test("CORS, GeoJSON MIME, conditional GET, HEAD, and non-cacheable errors", async () => {
  const body = query("limit=1");
  const response = jsonResponse(
    body,
    new Request("https://maio.test"),
    snapshot.revision,
    200,
    true,
  );
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.match(response.headers.get("content-type"), /application\/geo\+json/);
  const etag = response.headers.get("etag");
  for (const value of [etag, `W/${etag}`, `"other", ${etag}`, "*"])
    assert.equal(
      jsonResponse(
        body,
        new Request("https://maio.test", {
          headers: { "if-none-match": value },
        }),
        snapshot.revision,
      ).status,
      304,
    );
  assert.equal(
    await jsonResponse(
      body,
      new Request("https://maio.test", { method: "HEAD" }),
      snapshot.revision,
    ).text(),
    "",
  );
  assert.equal(
    jsonResponse(
      { error: "bad" },
      new Request("https://maio.test"),
      snapshot.revision,
      400,
    ).headers.get("cache-control"),
    "no-store",
  );
});
test("OpenAPI paths and references are complete", () => {
  const spec = openapi(snapshot);
  assert.equal(spec.openapi, "3.1.0");
  assert.equal(Object.keys(spec.paths).length, 45);
  function walk(v) {
    if (!v || typeof v !== "object") return;
    if (v.$ref) assert.ok(spec.components.schemas[v.$ref.split("/").at(-1)]);
    for (const child of Object.values(v)) walk(child);
  }
  walk(spec);
  assert.equal(
    spec.paths["/features"].get.parameters.find((p) => p.name === "limit")
      .schema.maximum,
    500,
  );
});

test("Guide corrections retain shared IDs, dual provenance and surveyed trail geometry", async () => {
  const guide = JSON.parse(
    await readFile(
      new URL(
        "../../guide/public/data/maio_places_with_coords.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const source = guide.find((p) => p.id === "dunas-do-morrinho");
  const merged = snapshot.features.find(
    (f) => f.id === "visit-maio-dunas-do-morrinho",
  );
  assert.deepEqual(merged.geometry.coordinates, source.coordinates);
  assert.ok(merged.properties.sourceIds.includes("visit-maio"));
  assert.ok(merged.properties.sourceIds.includes("guide-places"));
  assert.equal(merged.properties.geometrySourceId, "guide-places");
  const survey = snapshot.features.filter((f) =>
    f.properties.sourceIds.includes("guide-offroad"),
  );
  assert.equal(survey.length, 12);
  assert.ok(
    survey.every(
      (f) =>
        f.geometry.type === "LineString" &&
        f.properties.collections.includes("trails"),
    ),
  );
});

test("planned sports preserve location provenance and do not imply operating facilities", () => {
  const result = query("", "sports");
  assert.equal(result.numberMatched, 3);
  for (const f of result.features) {
    assert.equal(f.properties.lifecycleStatus, "planned");
    const location = snapshot.features.find(x => x.id === f.properties.attributes.locationFeatureId);
    assert.deepEqual(f.geometry, location.geometry);
    assert.equal(f.properties.geometrySourceId, location.properties.geometrySourceId);
    assert.ok(f.properties.attributes.activities.includes("surfing"));
  }
  const provisional = result.features.find(f => f.id === "planned-sports-boa-lagoa");
  assert.equal(provisional.properties.attributes.locationVerification, "name-confirmation-pending");
  assert.equal(snapshot.collections.find(c => c.id === "sports").status, "available");
});
