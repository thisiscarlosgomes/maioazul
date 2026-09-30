import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveApi} from '../lib/api.mjs';
const snapshot=JSON.parse(await readFile(new URL('../data/snapshot.json',import.meta.url)));
const api=(p,q='')=>resolveApi(snapshot,p.split('/'),new URLSearchParams(q));
test('discovery catalog connects source identity, dependent resources and refresh contracts',()=>{
 const catalog=api('catalog');assert.equal(catalog.role,'public-data-interoperability-layer');
 assert.equal(catalog.collections.length,snapshot.collections.length);
 assert.equal(catalog.datasets.length,snapshot.datasets.length);
 for(const source of catalog.sources){
  assert.equal(source.refresh.automatic,false);assert.equal(source.refresh.freshnessAssessment,'not-assessed');
  assert.deepEqual(api(`sources/${source.id}`).upstreamUrls,source.upstreamUrls);
  assert.ok(source.transformation.implementation);
  const rows=api('features',`sourceId=${source.id}&limit=500`);
  assert.ok(rows.features.every(f=>f.properties.sourceIds.includes(source.id)));
  assert.equal(rows.numberMatched,snapshot.features.filter(f=>f.properties.publicationStatus !== "withdrawn" && f.properties.sourceIds.includes(source.id)).length);
  for(const link of [...source.links.collections,...source.links.datasets]) assert.ok(api(link.replace('/api/v1/','')));
 }
});
test('unverified extracts are not upgraded to authoritative or fresh data',()=>{
 const population=api('sources/dashboard-population');
 assert.equal(population.provenanceStatus,'needs-review');assert.deepEqual(population.upstreamUrls,[]);
 assert.equal(population.classification,'secondary-extract');
 const model=api('sources/open-meteo-weather');assert.equal(model.classification,'model-provider');assert.ok(model.upstreamUrls[0].startsWith('https://api.open-meteo.com/'));
 const datasets=api('datasets').datasets;
 assert.ok(datasets.every(d=>d.links.sources.every(url=>api(url.replace('/api/v1/','')))));
 assert.equal(api('features','sourceId=unknown').numberMatched,0);
 assert.throws(()=>api('sources/unknown'),e=>e.status===404);
 assert.throws(()=>api('features','sourceId=a&sourceId=b'),e=>e.status===400);
});
