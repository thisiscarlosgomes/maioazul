import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveApi} from '../lib/api.mjs';
import {normalizeEnvironment,providers} from '../lib/environment.mjs';
const snapshot=JSON.parse(await readFile(new URL('../data/snapshot.json',import.meta.url)));
const bundle=JSON.parse(await readFile(new URL('../data/environment-source.json',import.meta.url)));
const api=(path,q='')=>resolveApi(snapshot,path.split('/'),new URLSearchParams(q));
test('every environmental value, unit, location and time comes from the saved upstream response',()=>{
 assert.deepEqual(snapshot.observations,normalizeEnvironment(bundle));
 for(const o of snapshot.observations){
  const entry=bundle.entries.find(e=>e.sourceId===o.sourceId);
  const variable=Object.entries(providers.find(p=>p.id===o.sourceId).variables).find(([,p])=>p===o.parameter)[0];
  assert.equal(o.value,entry.payload.current[variable]);
  assert.equal(o.unit,entry.payload.current_units[variable]);
  assert.equal(Date.parse(o.observedAt),entry.payload.current.time*1000);
  assert.equal(o.retrievedAt,entry.retrievedAt);
  assert.equal(o.sensorId,null);assert.equal(o.observationKind,'model-estimate');
  assert.deepEqual(api(`observations/${o.id}`).id,o.id);
  assert.ok(snapshot.sources.some(s=>s.id===o.sourceId&&s.license==='CC-BY-4.0'));
 }
 assert.equal(api('sensors').status,'planned');assert.deepEqual(api('sensors').sensors,[]);
 assert.equal(api('collections/observations').count,snapshot.observations.length);
});
test('missing upstream values are skipped and malformed values fail closed',()=>{
 const copy=structuredClone(bundle), provider=providers.find(p=>p.id===copy.entries[0].sourceId), key=Object.keys(provider.variables)[0];
 const original=normalizeEnvironment(copy).length;
 copy.entries[0].payload.current[key]=null;
 assert.equal(normalizeEnvironment(copy).length,original-1);
 copy.entries[0].payload.current[key]='bad';
 assert.throws(()=>normalizeEnvironment(copy),/Invalid/);
});
test('inclusive temporal, spatial and identity filtering and pagination',()=>{
 const first=snapshot.observations[0];
 assert.ok(api('observations',new URLSearchParams({from:first.observedAt,to:first.observedAt,parameter:first.parameter}).toString()).observations.some(o=>o.id===first.id));
 assert.equal(api('observations','bbox=0,0,1,1').numberMatched,0);
 assert.equal(api('observations','sensorId=not-registered').numberMatched,0);
 assert.equal(api('observations','featureId=not-linked').numberMatched,0);
 let url='/api/v1/observations?limit=2', ids=[];
 while(url){const parsed=new URL(url,'https://maio.test');const page=api('observations',parsed.search);ids.push(...page.observations.map(o=>o.id));url=page.links.next;}
 assert.deepEqual(ids,snapshot.observations.map(o=>o.id));
 const sensorSnapshot={...snapshot,sensors:[{id:'fixture-sensor',featureId:'fixture-feature',parameters:['temperature'],geometry:{type:'Point',coordinates:[-23.15,15.25]}}],observations:[{...first,sensorId:'fixture-sensor',featureId:'fixture-feature',parameter:'temperature'}]};
 const sensors=resolveApi(sensorSnapshot,['sensors'],new URLSearchParams({from:first.observedAt,to:first.observedAt,parameter:'temperature'}));
 assert.equal(sensors.numberMatched,1);
});
test('invalid filters are rejected on both populated and planned lists',()=>{
 for(const path of ['observations','sensors']) for(const q of ['limit=0','offset=-1','bbox=1,2,3','from=2026-02-30T00:00:00Z','from=2026-09-17','from=2026-09-18T00:00:00Z&to=2026-09-17T00:00:00Z','to=2026-09-17T25:00:00Z','parameter=x&parameter=y','unknown=x']) assert.throws(()=>api(path,q),e=>e.status===400,`${path}?${q}`);
 for(const path of ['observations/unknown','sensors/unknown','observations/unknown/extra']) assert.throws(()=>api(path),e=>e.status===404);
 const capabilities=api('observation-parameters').parameters;
 assert.equal(capabilities.find(p=>p.id==='water-level').status,'planned');
 assert.equal(capabilities.find(p=>p.id==='temperature').status,'available');
});
