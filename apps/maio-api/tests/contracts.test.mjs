import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { openapi } from '../lib/openapi.mjs';
import { resolveApi, jsonResponse } from '../lib/api.mjs';
const snapshot = JSON.parse(await readFile(new URL('../data/snapshot.json', import.meta.url)));
const get = (path, query = '') => resolveApi(snapshot, path.split('/'), new URLSearchParams(query));

test('all operations expose reusable success and consistent error contracts', () => {
  const spec = openapi(snapshot);
  assert.equal(spec.openapi, '3.1.0');
  for (const { get } of Object.values(spec.paths)) {
    for (const media of Object.values(get.responses[200].content)) assert.ok(media.schema.$ref);
    for (const status of [400,404,405,500]) assert.equal(get.responses[status].content['application/json'].schema.$ref, '#/components/schemas/Error');
    assert.ok(get.responses[304].headers.ETag);
  }
  assert.equal(spec.components.schemas.Feature.properties.geometry.$ref, '#/components/schemas/Geometry');
});

test('pagination preserves filters and exhausts a revision without duplicates', () => {
  for (const [path, query, key] of [
    ['features','collection=beaches','features'], ['places','q=a','places'],
    ['observations','parameter=temperature','observations'], ['datasets/municipal-budget/records','year=2025','records'],
  ]) {
    let page = get(path, `${query}&limit=3`);
    const expected = page.numberMatched, ids = [];
    for (;;) {
      assert.equal(page.revision, snapshot.revision);
      ids.push(...page[key].map(r => r.id));
      if (!page.links.next) break;
      const url = new URL(page.links.next, 'https://example.org');
      for (const [k,v] of new URLSearchParams(query)) assert.equal(url.searchParams.get(k), v);
      page = get(path, url.searchParams.toString());
    }
    assert.equal(ids.length, expected);
    assert.equal(new Set(ids).size, expected);
    assert.equal(get(path, `${query}&offset=999999`).numberReturned, 0);
    for (const invalid of ['limit=0','offset=-1','limit=2&limit=3','unsupported=x']) {
      assert.throws(() => get(path, `${query}&${invalid}`), e => e.status === 400);
    }
  }
});

test('conditional GET and HEAD support weak/list/wildcard validators without caching errors', async () => {
  const body = get('observations');
  const response = jsonResponse(body, new Request('https://example.org'), snapshot.revision);
  const tag = response.headers.get('etag');
  for (const method of ['GET','HEAD']) for (const value of [tag, `W/${tag}`, `"other", W/${tag}`, '*']) {
    const r = jsonResponse(body, new Request('https://example.org', {method, headers:{'if-none-match':value}}), snapshot.revision);
    assert.equal(r.status, 304); assert.equal(await r.text(), '');
    assert.equal(r.headers.get('x-data-revision'), snapshot.revision);
  }
  const r = jsonResponse({error:{status:404,message:'Not found'}}, new Request('https://example.org', {headers:{'if-none-match':'*'}}), snapshot.revision,404);
  assert.equal(r.status,404); assert.equal(r.headers.get('cache-control'),'no-store');
});

test('published resource IDs, geographic rings and attribution remain intact', () => {
  const sources = new Set(snapshot.sources.map(s => s.id));
  for (const rows of [snapshot.features,snapshot.places,snapshot.datasets,snapshot.sources,snapshot.observations,...snapshot.datasets.map(d=>d.records||[])]) {
    assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
    for (const row of rows) {
      assert.match(row.id,/^[A-Za-z0-9._~-]+$/);
      const ids = row.properties?.sourceIds || row.sourceIds || (row.sourceId ? [row.sourceId] : []);
      for (const id of ids) assert.ok(sources.has(id), `${row.id}: missing ${id}`);
    }
  }
  for (const feature of snapshot.features) {
    assert.ok(feature.properties.sourceIds.length);
    const g = feature.geometry;
    if (!g) { assert.equal(feature.properties.geometryStatus,'missing'); continue; }
    assert.equal('crs' in g,false);
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const polygon of polygons) for (const ring of polygon) {
      assert.ok(ring.length >= 4); assert.deepEqual(ring[0],ring.at(-1));
    }
  }
});

test('roads exclude bus stops while preserving source geometry and stable stop IDs', async () => {
  const raw = JSON.parse(await readFile(new URL('../../../public/data/transport_network.geojson', import.meta.url)));
  const byId = new Map(snapshot.features.map(f => [f.id,f]));
  for (const source of raw.features) {
    const sourceId = source.id || source.properties['@id'];
    const record = byId.get(`osm-${sourceId.replace('/','-')}`);
    if (source.properties.highway === 'bus_stop') {
      assert.ok(record.properties.collections.includes('transport'));
      assert.ok(!record.properties.collections.includes('roads'));
      assert.deepEqual(record.geometry,source.geometry);
      assert.ok(record.properties.sourceIds.includes('transport_network'));
    }
    if (record?.properties.collections.includes('roads')) {
      assert.ok(['LineString','MultiLineString'].includes(record.geometry.type));
      assert.deepEqual(record.geometry,source.geometry);
    }
  }
});

test('withdrawn roads are excluded from listings while stable detail IDs survive', () => {
  const page = get('collections/roads/items');
  assert.equal(page.numberMatched,0);
  assert.equal(page.publicationStatus,'withdrawn');
  assert.equal(get('collections/roads').status,'planned');
  assert.equal(get('collections/roads').count,0);
  assert.equal(get('features','collection=roads').numberMatched,0);
  const road = snapshot.features.find(f=>f.properties.collections.includes('roads'));
  assert.equal(get(`features/${road.id}`).properties.publicationStatus,'withdrawn');
  const listed = get('features','limit=500');
  assert.ok(listed.features.every(f=>f.properties.publicationStatus !== 'withdrawn'));
});

test('transport publishes only the two gateways and retains withdrawn detail IDs', () => {
  const page = get('collections/transport/items');
  assert.equal(page.numberMatched, 2);
  assert.deepEqual(page.features.map(f => f.id).sort(), ['enapor-porto-ingles', 'osm-way-400062197']);
  const port = get('features/enapor-porto-ingles');
  assert.deepEqual(port.geometry, { type: 'Point', coordinates: [-23.2206, 15.1386] });
  assert.equal(port.properties.geometrySourceId, 'user-porto-ingles-coordinates');
  assert.deepEqual(port.properties.sourceIds, ['enapor-porto-ingles', 'user-porto-ingles-coordinates']);
  assert.equal(get('sources/enapor-porto-ingles').url, 'https://enapor.cv/page/porto-ingles');
  const previous = snapshot.features.filter(f => f.properties.collections.includes('transport') && f.properties.publicationStatus === 'withdrawn');
  assert.equal(previous.length, 27);
  for (const f of previous) assert.equal(get(`features/${f.id}`).properties.publicationStatus, 'withdrawn');
  assert.equal(get('features/osm-way-172092807').properties.attributes.parentFeatureId, 'osm-way-400062197');
  assert.deepEqual(get('features/osm-way-400062197').properties.attributes.componentFeatureIds, ['osm-way-172092807']);
});
