import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveApi, jsonResponse } from '../lib/api.mjs';
const snapshot = JSON.parse(await readFile(new URL('../data/snapshot.json', import.meta.url)));
const api = (p,q='') => resolveApi(snapshot,p.split('/'),new URLSearchParams(q));
const records = api('datasets/business-demography/records','limit=500').records;
const record = suffix => records.find(r=>r.id===`iae-2024-maio-${suffix}`);
test('IAE source totals retain precision, scope and thousand-CVE units',()=>{
  assert.equal(records.length,61);
  assert.equal(record('active-enterprises-total-total').value,307.9999919999999);
  assert.equal(record('persons-employed-total-total').value,733.6984159999997);
  const turnover=record('turnover-total-total');
  assert.equal(turnover.value,679246.4781422619);
  assert.equal(turnover.unit,'thousand-CVE');
  assert.equal(turnover.sourceRecordId,"'Tabela3_Cabo Verde_VVN'!G15");
  assert.ok(records.every(r=>r.year===2024 && r.placeId===null && r.sourceCell.cell && r.updatedAt===null));
  assert.equal(record('active-enterprises-activity-g').geographicScope,'island:maio');
});
test('IAE missing markers stay null while reported zeroes stay zero',()=>{
  const missing=record('active-enterprises-size-large');
  assert.equal(missing.value,null);
  assert.equal(missing.valueStatus,'missing');
  assert.equal(missing.sourceCell.rawValue,'---');
  assert.equal(record('persons-employed-size-large').value,0);
  assert.equal(record('persons-employed-size-large').valueStatus,'reported');
});
test('Statistical collection preserves provenance without inventing business locations',()=>{
  const result=api('collections/business-statistics/items','limit=500');
  assert.equal(result.numberMatched,61);
  assert.ok(result.features.every(f=>f.geometry===null && f.properties.recordType==='aggregate-statistic' && f.properties.sourceRecordId));
  assert.equal(api('collections/business-statistics/items','bbox=-23.3,15.05,-23.02,15.4').numberMatched,0);
  const source=api('sources/iae-2024-user-workbook');
  assert.equal(source.provenanceStatus,'needs-review');
  assert.equal(source.classification,'secondary-extract');
  assert.match(source.checksum,/^[a-f0-9]{64}$/);
});
test('IAE pagination, year filters and conditional requests use shared API contracts',()=>{
  let path='/api/v1/datasets/business-demography/records?year=2024&limit=7';
  const ids=[];
  while(path){const url=new URL(path,'https://maio.test');const p=api('datasets/business-demography/records',url.search);ids.push(...p.records.map(r=>r.id));path=p.links.next;}
  assert.equal(new Set(ids).size,61);
  const body=api('collections/business-statistics/items');
  const first=jsonResponse(body,new Request('https://maio.test'),snapshot.revision,200,true);
  assert.match(first.headers.get('content-type'),/geo\+json/);
  assert.equal(jsonResponse(body,new Request('https://maio.test',{headers:{'if-none-match':first.headers.get('etag')}}),snapshot.revision,200,true).status,304);
  assert.equal(api('datasets/business-demography/records','year=2025').numberMatched,0);
});
