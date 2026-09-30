import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveApi} from '../lib/api.mjs';
const source=JSON.parse(await readFile(new URL('../data/dashboard-population.json',import.meta.url)));
const snapshot=JSON.parse(await readFile(new URL('../data/snapshot.json',import.meta.url)));
test('population preserves dashboard values and exposes missing publication provenance',()=>{
 const dataset=resolveApi(snapshot,['datasets','population'],new URLSearchParams());
 assert.equal(dataset.status,'available');
 assert.equal(dataset.records.length,source.records.length);
 for(const raw of source.records){
  const page=resolveApi(snapshot,['datasets','population','records'],new URLSearchParams({year:String(raw.year)}));
  assert.equal(page.records.length,1);
  const row=page.records[0];assert.equal(row.value,raw.population);assert.equal(row.unit,'residents');assert.equal(row.referencePeriod,String(raw.year));
  assert.equal(row.quality,'needs_review');assert.equal(row.placeId,null);assert.equal(row.updatedAt,null);
  assert.equal(row.databaseUpdatedAt,raw.databaseUpdatedAt);assert.equal(row.retrievedAt,source.retrievedAt);
  assert.ok(row.caveats.some(c=>c.includes('not verified RGPH 2021')));
 }
 assert.equal(resolveApi(snapshot,['datasets','population','records'],new URLSearchParams({placeId:'calheta'})).numberMatched,0);
});
