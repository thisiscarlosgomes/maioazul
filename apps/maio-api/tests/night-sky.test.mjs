import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {queryNightSky} from '../lib/night-sky.mjs';
import {resolveApi,ApiError,jsonResponse} from '../lib/api.mjs';
const snapshot=JSON.parse(await readFile(new URL('../data/snapshot.json',import.meta.url)));
const query=q=>resolveApi(snapshot,['night-sky'],new URLSearchParams(q));
test('night sky covers full years, leap days and year-crossing nights with provenance',()=>{
  for(const [year,count] of [[2026,365],[2028,366],[2100,365]]) {
    const result=query(`year=${year}&limit=500`);
    assert.equal(result.records.length,count);assert.equal(new Set(result.records.map(r=>r.id)).size,count);
    assert.equal(result.records[0].date,`${year}-01-01`);assert.equal(result.records.at(-1).date,`${year}-12-31`);
    assert.equal(result.records.at(-1).astronomicalNight.end.slice(0,10),`${year+1}-01-01`);
    assert.equal(result.sourceUpdatedAt,null);assert.equal(result.retrievedAt,null);
    for(const r of result.records) {
      assert.match(r.id,/^[A-Za-z0-9._~-]+$/);assert.equal(r.sourceId,'astronomy-engine');assert.equal(r.sourceRecordId,null);
      assert.ok(Date.parse(r.sunrise)<Date.parse(r.sunset));
      assert.ok(Date.parse(r.astronomicalDawn)<Date.parse(r.nauticalDawn));
      assert.ok(Date.parse(r.nauticalDawn)<Date.parse(r.civilDawn));
      assert.ok(Date.parse(r.civilDawn)<Date.parse(r.sunrise));
      assert.ok(Date.parse(r.sunset)<Date.parse(r.civilDusk));
      assert.ok(Date.parse(r.civilDusk)<Date.parse(r.nauticalDusk));
      assert.ok(Date.parse(r.nauticalDusk)<Date.parse(r.astronomicalDusk));
      assert.ok(r.moon.illuminatedFraction>=0 && r.moon.illuminatedFraction<=1);
      assert.ok(r.astronomicalNight.durationSeconds>0);
      for(const key of ['sunrise','sunset','moonrise','moonset']) if(r[key]) {
        assert.equal(new Date(Date.parse(r[key])-3600000).toISOString().slice(0,10),r.date);
      }
    }
    assert.ok(result.records.some(r=>r.moonrise===null));assert.ok(result.records.some(r=>r.moonset===null));
  }
});
test('night sky filters are strict and paging pins the date context',()=>{
  for(const q of ['year=1999','year=2101','year=2026&year=2027','date=2026-02-29','date=','date=2028-02-29&year=2026','latitude=15.25','latitude=0&longitude=0','latitude=15.1234567&longitude=-23.15','limit=0','offset=-1','sensorId=x']) assert.throws(()=>query(q),e=>e instanceof ApiError && e.status===400);
  assert.equal(query('date=2028-02-29').numberMatched,1);
  const first=query('year=2028&limit=200&latitude=15.2&longitude=-23.2');
  const second=query(new URL(first.links.next,'https://example.org').search.slice(1));
  assert.equal(first.numberReturned+second.numberReturned,366);assert.equal(first.revision,second.revision);
  assert.equal(first.records.at(-1).date < second.records[0].date,true);
  assert.equal(query('year=2026&offset=999999').numberReturned,0);
  assert.equal(queryNightSky(new URLSearchParams('limit=1'),m=>Error(m),new Date('2027-01-01T00:30:00Z')).year,2026);
});
test('night sky calculations are deterministic and support conditional requests',async()=>{
  const body=query('date=2026-09-17');assert.deepEqual(body,query('date=2026-09-17'));
  assert.notEqual(body.revision,query('date=2026-09-17&latitude=15.2&longitude=-23.2').revision);
  const response=jsonResponse(body,new Request('https://example.org'),body.revision);
  const cached=jsonResponse(body,new Request('https://example.org',{headers:{'If-None-Match':response.headers.get('etag')}}),body.revision);
  assert.equal(cached.status,304);assert.equal(await cached.text(),'');
  const source=resolveApi(snapshot,['sources','astronomy-engine'],new URLSearchParams());
  assert.equal(source.classification,'calculation-model');assert.equal(source.delivery,'on-demand-calculation');
});
