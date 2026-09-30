import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolveApi, queryFeatures, jsonResponse } from "../lib/api.mjs";
import { openapi } from "../lib/openapi.mjs";
const snapshot = JSON.parse(await readFile(new URL("../data/snapshot.json", import.meta.url)));
const baseline = JSON.parse(await readFile(new URL("./v1-baseline.json", import.meta.url)));
const removedBeaches = JSON.parse(await readFile(new URL("./removed-unnamed-beaches.json", import.meta.url)));
const api = (path, query = "") => resolveApi(snapshot, path.split("/"), new URLSearchParams(query));
const hash = x => createHash("sha256").update(JSON.stringify(x)).digest("hex");

test("Retained V1 feature IDs, memberships and dataset payloads survive V1.1", () => {
  assert.equal(snapshot.version, "1.1.0");
  for (const [id, memberships] of Object.entries(baseline.features)) {
    if (removedBeaches.includes(id)) continue;
    const feature = api(`features/${id}`);
    for (const c of memberships) {
      // Corrected classification: OSM bus-stop points are transport assets, not roads.
      if (c === "roads" && feature.properties.attributes.highway === "bus_stop") {
        assert.ok(feature.properties.collections.includes("transport"));
        assert.ok(!feature.properties.collections.includes("roads"));
      } else assert.ok(feature.properties.collections.includes(c));
    }
  }
  for (const [id, checksum] of Object.entries(baseline.datasets)) {
    const dataset = api(`datasets/${id}`);
    assert.equal(hash(dataset.payload), checksum);
    assert.equal(dataset.checksum, checksum);
    assert.equal(dataset.status, "available");
  }
});
test("new collections classify existing records without fabricating features", () => {
  assert.equal(snapshot.features.filter(f => !f.properties.collections.includes("observations") && !f.properties.collections.includes("agriculture") && f.properties.recordType !== "aggregate-statistic" && f.id !== "enapor-porto-ingles").length, Object.keys(baseline.features).length - removedBeaches.length);
  for (const id of ["localities", "schools", "health", "heritage", "land-use"]) {
    const result = api(`collections/${id}/items`);
    assert.ok(result.numberMatched > 0);
    assert.equal(api(`collections/${id}`).status, "available");
  }
  for (const id of ["admin-boundaries", "government", "waste-infrastructure", "connectivity"]) {
    assert.equal(api(`collections/${id}`).status, "planned");
    assert.deepEqual(api(`collections/${id}/items`).features, []);
  }
});
test("places have resolvable stable source IDs and no duplicated underlying payloads", () => {
  const places = api("places").places;
  assert.equal(new Set(places.map(p => p.id)).size, places.length);
  for (const p of places) {
    assert.deepEqual(p.geometry, api(`features/${p.geometrySourceFeatureId}`).geometry);
    assert.ok(p.sourceFeatureIds.every(id => baseline.features[id]));
    assert.equal(p.attributes, undefined);
    for (const link of Object.values(p.links)) assert.ok(api(link.replace("/api/v1/", "")));
  }
  const calheta = api("places/calheta");
  assert.equal(calheta.name, "Calheta");
  assert.ok(api("places/calheta/infrastructure").features.some(f => f.id === "osm-way-1243757224"));
  assert.equal(api("places/calheta/datasets").numberMatched, 0);
  assert.equal(api("places/calheta/datasets").status, "no-records");
  assert.equal(api("places/calheta/features", "collection=beaches").numberMatched, 0);
  assert.deepEqual(api("places", "q=CALHETA").places.map(p=>p.id), api("places", "q=calheta").places.map(p=>p.id));
});
test("new listings paginate deterministically and retain filters", () => {
  for (const [path, key, filter] of [["places", "places", "q=calheta"], ["datasets/municipal-budget/records", "records", "year=2026"]]) {
    let url = `${path}?limit=1&${filter}`, ids = [];
    while (url) {
      const parsed = new URL(url, "https://maio.test/");
      const result = api(parsed.pathname.replace(/^\/(api\/v1\/)?/, ""), parsed.search);
      ids.push(...result[key].map(row => row.id));
      if (result.links.next) assert.ok(result.links.next.includes(filter));
      url = result.links.next;
    }
    assert.ok(ids.length > 1);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(ids, api(path, filter)[key].map(row => row.id));
  }
});
test("budget records reproduce source summaries and carry extraction caveats", async () => {
  const records = api("datasets/municipal-budget/records").records;
  const sourceIds = new Set(snapshot.sources.map(s => s.id));
  for (const year of [2025, 2026]) {
    const raw = JSON.parse(await readFile(new URL(`../../../public/data/municipal-budget-ingestion/maio-${year}/maio_budget_${year}.first_pass.json`, import.meta.url)));
    const rows = records.filter(r => r.year === year);
    assert.ok(rows.length > 0);
    for (const r of rows) {
      assert.equal(r.value, raw.budget_summary[r.indicator]);
      assert.equal(r.sourceId, raw.source_document.id);
      assert.ok(sourceIds.has(r.sourceId));
      assert.equal(r.quality, "needs_review");
      assert.equal(r.unit, "CVE");
      assert.equal(r.placeId, null);
      assert.equal(r.retrievedAt, null);
      assert.ok(r.caveats.length);
    }
  }
  assert.equal(api("datasets/municipal-budget/records", "year=1900").numberMatched, 0);
  assert.equal(api("datasets/municipal-budget/records", "placeId=calheta").numberMatched, 0);
  assert.ok(!JSON.stringify(api("datasets/municipal-budget")).includes("/Users/"));
});
test("planned datasets and transport return empty records with truthful metadata", () => {
  const planned = snapshot.datasets.filter(d=> d.status === "planned");
  assert.equal(planned.length, 11);
  for (const d of planned) {
    assert.equal(api(`datasets/${d.id}`).payload, null);
    const result = api(`datasets/${d.id}/records`);
    assert.equal(result.status, "planned");
    assert.deepEqual(result.records, []);
    assert.deepEqual(result.sourceIds, []);
  }
  for (const key of ["routes", "schedules", "arrivals", "departures"]) {
    const response = api(`transport/${key}`, "mode=air&date=2026-09-17&limit=1");
    assert.equal(response.status, "planned");
    assert.equal(response.numberMatched, 0);
    assert.deepEqual(response[key], []);
    assert.equal(response.updatedAt, null);
  }
  assert.equal(api("transport").status, "planned");
  assert.ok(api("collections/transport/items").numberMatched > 0);
});
test("new routes strictly reject invalid parameters and unknown paths", () => {
  for (const [path, query] of [["places", "limit=0"], ["places", "limit=1&limit=2"], ["places/calheta", "q=x"], ["places/calheta/datasets", "offset=-1"], ["datasets/population/records", "year=NaN"], ["datasets/population/records", "year=0"], ["datasets/population/records", "year=2025&year=2026"], ["transport/routes", "mode=bus"], ["transport/schedules", "date=2026-02-30"], ["transport/arrivals", "date=no"], ["transport/departures", "limti=2"]]) {
    assert.throws(()=>api(path, query), e=> e.status === 400, `${path}?${query}`);
  }
  for (const path of ["places/unknown", "places/calheta/unknown", "places/calheta/features/extra", "transport/unknown", "transport/routes/extra", "datasets/unknown/records"]) assert.throws(()=>api(path), e=>e.status===404);
});
test("new response resources preserve anonymous CORS, ETags and HEAD", async () => {
  for (const path of ["places", "places/calheta/features", "datasets/population/records", "transport/schedules"]) {
    const body=api(path), request=new Request(`https://maio.test/api/v1/${path}`);
    const response=jsonResponse(body,request,snapshot.revision,200,body.type==='FeatureCollection');
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    const conditional=jsonResponse(body,new Request(request,{headers:{'if-none-match':response.headers.get('etag')}}),snapshot.revision);
    assert.equal(conditional.status,304);
    assert.equal(await jsonResponse(body,new Request(request,{method:'HEAD'}),snapshot.revision).text(),'');
  }
});
test("V1.1 spec covers every new route, real schemas and read-only contracts", () => {
  const spec=openapi(snapshot);
  assert.equal(spec.info.version,'1.1.0');
  for (const [path, item] of Object.entries(spec.paths)) {
    assert.deepEqual(Object.keys(item), ['get']);
    for (const name of [...path.matchAll(/\{(.*?)\}/g)].map(m=>m[1])) assert.ok(item.get.parameters.some(p=>p.name===name&&p.in==='path'&&p.required));
    assert.ok(item.get.responses[304]);
  }
  for (const name of ['Place','DatasetRecord','TransportEndpoint','TransportOperator','TransportRoute','TransportSchedule']) assert.ok(spec.components.schemas[name].required.length);
  assert.deepEqual(spec.security,[]);
});

test("unnamed beach records are excluded by the publication policy", () => {
  for (const id of removedBeaches) {
    assert.throws(() => api(`features/${id}`), e => e.status === 404);
  }
  const beaches = api("collections/beaches/items").features;
  assert.ok(beaches.length > 0);
  for (const beach of beaches) {
    assert.equal(beach.properties.nameStatus, "sourced");
    assert.ok(beach.properties.name);
    assert.ok(beach.properties.displayName.trim());
    assert.notEqual(beach.properties.displayName, "Unnamed beach");
  }
});
