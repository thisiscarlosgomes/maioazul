import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as Astronomy from 'astronomy-engine';
import {resolveApi,ApiError,jsonResponse} from '../lib/api.mjs';
const snapshot=JSON.parse(await readFile(new URL('../data/snapshot.json',import.meta.url)));
const api=(path,q='')=>resolveApi(snapshot,path.split('/'),new URLSearchParams(q));
test('astronomy domain distinguishes available calculations from planned capabilities',()=>{
  const domain=api('astronomy');assert.equal(domain.capabilities.length,8);
  for(const id of ['sky','moon','constellations','almanac'])assert.equal(domain.capabilities.find(c=>c.id===id).status,'available');
  for(const id of ['meteor-showers','dark-sky-spots','stargazing-score'])assert.equal(domain.capabilities.find(c=>c.id===id).status,'planned');
  assert.ok(api('catalog').domains.some(d=>d.id==='astronomy'));
  assert.equal(api('sources/astronomy-engine').links.astronomy,'/api/v1/astronomy');
  assert.throws(()=>api('astronomy/sky/extra','date=2026-12-15'),e=>e.status===404);
});
test('sky and moon honor requested local time and preserve original model results',()=>{
  const sky=api('astronomy/sky','date=2026-12-15&time=22:00');
  assert.equal(sky.at,'2026-12-15T23:00:00.000Z');
  const original=api('night-sky/constellations',`at=${sky.at}&aboveHorizon=true`);
  assert.deepEqual(sky.constellations,original.records);assert.equal(sky.isAstronomicalDarkness,original.isAstronomicalDarkness);
  const annual=api('night-sky','date=2026-12-15');assert.equal(sky.solarEvents.sunset,annual.records[0].sunset);
  assert.deepEqual(api('astronomy/moon','date=2026-12-15&time=22:00').moon,sky.moon);
  const early=api('astronomy/moon','date=2026-12-15&time=03:30');
  assert.equal(early.moon.evaluatedAt,'2026-12-15T04:30:00.000Z');
  assert.equal(early.moon.illuminatedFraction,Astronomy.Illumination(Astronomy.Body.Moon,new Date(early.at)).phase_fraction);
  assert.notEqual(early.moon.phaseAngleDegrees,sky.moon.phaseAngleDegrees);
  assert.equal(early.retrievedAt,null);assert.equal(sky.retrievedAt,original.retrievedAt);
});
test('month views sample every local date including leap years and paginate days',()=>{
  const month=api('astronomy/constellations','year=2026&month=12');assert.equal(month.numberMatched,31);assert.equal(month.time,'22:00');
  assert.equal(month.records[0].date,'2026-12-01');assert.equal(month.records.at(-1).date,'2026-12-31');
  const feb=api('astronomy/constellations','year=2028&month=2');assert.equal(feb.numberMatched,29);
  assert.equal(api('astronomy/constellations','date=2028-02-29').numberMatched,1);
  const first=api('astronomy/constellations','year=2026&month=12&time=21:30&constellationId=ori&limit=10');
  const next=new URL(first.links.next,'https://example.org');assert.equal(next.searchParams.get('year'),'2026');assert.equal(next.searchParams.get('time'),'21:30');assert.equal(next.searchParams.get('constellationId'),'ori');
  const second=api('astronomy/constellations',next.search.slice(1));assert.equal(first.revision,second.revision);
  assert.equal(first.records.at(-1).date,'2026-12-10');assert.equal(second.records[0].date,'2026-12-11');
  const d=api('astronomy/constellations','date=2026-12-15&aboveHorizon=false').records[0];assert.ok(d.constellations.every(c=>!c.aboveHorizon));
  assert.equal(api('astronomy/constellations','month=12&offset=9999').numberReturned,0);
  assert.ok(api('astronomy/constellations','month=12&limit=1').links.next.includes('year='));
});
test('unconnected capabilities expose empty records or a null score, never fake ratings',()=>{
  for(const path of ['meteor-showers','dark-sky-spots']) {
    const b=api(`astronomy/${path}`);assert.equal(b.status,'planned');assert.deepEqual(b.records,[]);assert.equal(b.numberMatched,0);assert.deepEqual(b.sourceIds,[]);
  }
  const s=api('astronomy/stargazing-score','date=2026-12-15&time=22:00');assert.equal(s.status,'planned');assert.equal(s.score,null);assert.equal(s.methodology,null);assert.equal(s.at,'2026-12-15T23:00:00.000Z');assert.equal(api('astronomy/stargazing-score').at,null);
});
test('astronomy parameters use consistent strict errors even on empty pages',()=>{
  for(const [path,q] of [
    ['sky',''],['sky','date=2026-02-29'],['moon','date=2026-12-15&time=25:00'],['sky','date=2026-12-15&latitude=15.25'],
    ['moon','date=2026-12-15&date=2026-12-16'],['sky','date=2026-12-15&aboveHorizon=maybe'],
    ['constellations','month=13'],['constellations',''],['constellations','month=2&date=2028-02-29'],['constellations','year=1999&month=12'],['constellations','month=12&offset=9999&aboveHorizon=wrong'],['constellations','month=12&limit=0'],
    ['meteor-showers','month=0'],['dark-sky-spots','unknown=1'],['stargazing-score','time=22:00'],['stargazing-score','date=2026-12-15&score=99'],
  ])assert.throws(()=>api(`astronomy/${path}`,q),e=>e instanceof ApiError&&e.status===400,`${path}?${q}`);
});
test('canonical almanac preserves legacy records and calculation endpoints retain 304',async()=>{
  const original=api('night-sky','year=2026&limit=10'),canonical=api('astronomy/almanac','year=2026&limit=10');assert.deepEqual(original.records,canonical.records);assert.equal(original.revision,canonical.revision);assert.ok(canonical.links.next.startsWith('/api/v1/astronomy/almanac?'));
  for(const [path,q] of [['sky','date=2026-12-15'],['constellations','month=12&year=2026'],['moon','date=2026-12-15'],['stargazing-score','']]){
    const b=api(`astronomy/${path}`,q),r=jsonResponse(b,new Request('https://example.org'),b.revision);
    const c=jsonResponse(b,new Request('https://example.org',{headers:{'If-None-Match':r.headers.get('etag')}}),b.revision);assert.equal(c.status,304);assert.equal(await c.text(),'');
  }
});
