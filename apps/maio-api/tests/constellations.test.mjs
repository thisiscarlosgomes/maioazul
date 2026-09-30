import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as Astronomy from 'astronomy-engine';
import {queryConstellations,constellationCatalog as catalog} from '../lib/constellations.mjs';
import {resolveApi,ApiError,jsonResponse} from '../lib/api.mjs';
const snapshot=JSON.parse(await readFile(new URL('../data/snapshot.json',import.meta.url)));
const api=q=>resolveApi(snapshot,['night-sky','constellations'],new URLSearchParams(q));
const at='at=2026-09-17T22:00:00-01:00';
test('catalogue preserves pinned upstream bytes, coordinates and all 88 identities',async()=>{
  for(const [name,checksum] of Object.entries(catalog.checksums)) {
    const data=await readFile(new URL(`../data/astronomy/${name.replaceAll('/','-')}`,import.meta.url));
    assert.equal(createHash('sha256').update(data).digest('hex'),checksum);
  }
  const raw=JSON.parse(await readFile(new URL('../data/astronomy/data-constellations.json',import.meta.url)));
  assert.equal(catalog.records.length,88);assert.equal(new Set(catalog.records.map(r=>r.id)).size,88);
  for(const r of catalog.records) {
    const source=raw.features.filter(f=>f.id===r.abbreviation);
    assert.equal(r.referencePoints.length,source.length);assert.equal(r.name,source[0].properties.la);
    r.referencePoints.forEach((p,i)=>{assert.equal(p.rightAscensionHours,((source[i].geometry.coordinates[0]+360)%360)/15);assert.equal(p.declinationDegrees,source[i].geometry.coordinates[1]);});
  }
  assert.equal(catalog.records.find(r=>r.id==='ser').referencePoints.length,2);
});
test('horizon geometry agrees with independent spherical altitude formula',()=>{
  const result=api(at), time=new Date(result.at),latitude=15.25*Math.PI/180;
  assert.equal(result.records.length,88);
  for(const r of result.records) {
    assert.ok(r.pattern.starsAboveHorizon>=0 && r.pattern.starsAboveHorizon<=r.pattern.starCount);
    assert.equal(r.aboveHorizon,r.pattern.starsAboveHorizon>0);
    assert.equal(r.pattern.horizonStatus,r.pattern.starsAboveHorizon===0?'below-horizon':r.pattern.starsAboveHorizon===r.pattern.starCount?'all-pattern-stars-above':'some-pattern-stars-above');
    for(const p of r.referencePoints) {
      const v=Astronomy.VectorFromSphere(new Astronomy.Spherical(p.declinationDegrees,p.rightAscensionHours*15,1),time);
      const eq=Astronomy.EquatorFromVector(Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(time),v));
      const h=(Astronomy.SiderealTime(time)*15-23.15-eq.ra*15)*Math.PI/180, dec=eq.dec*Math.PI/180;
      const altitude=Math.asin(Math.sin(latitude)*Math.sin(dec)+Math.cos(latitude)*Math.cos(dec)*Math.cos(h))*180/Math.PI;
      assert.ok(Math.abs(altitude-p.altitudeDegrees)<1e-8);
      assert.equal(p.aboveHorizon,p.altitudeDegrees>0);
      assert.ok(p.azimuthDegrees===null||(p.azimuthDegrees>=0&&p.azimuthDegrees<360));
    }
  }
  assert.equal(result.isAstronomicalDarkness,true);
  assert.equal(api('at=2026-09-17T13:00:00-01:00').isAstronomicalDarkness,false);
  assert.equal(api(at+'&constellationId=ori').records[0].aboveHorizon,false);
  assert.equal(api('at=2026-01-17T22:00:00-01:00&constellationId=ori').records[0].aboveHorizon,true);
});
test('filters, stable IDs, pagination and source links are consistent',()=>{
  const all=api(at),above=api(at+'&aboveHorizon=true'),below=api(at+'&aboveHorizon=false');
  assert.equal(above.numberMatched+below.numberMatched,88);assert.ok(above.records.every(r=>r.aboveHorizon));assert.ok(below.records.every(r=>!r.aboveHorizon));
  const first=api(at+'&aboveHorizon=true&limit=7');const second=api(new URL(first.links.next,'https://example.org').search.slice(1));
  assert.deepEqual([...first.records,...second.records].map(r=>r.id),above.records.slice(0,14).map(r=>r.id));
  assert.equal(api(at+'&constellationId=zzz').numberMatched,0);assert.equal(api(at+'&offset=1000').numberReturned,0);
  assert.deepEqual(all.records.map(r=>r.id),api('at=2026-01-17T22:00:00-01:00').records.map(r=>r.id));
  for(const id of all.sourceIds) assert.ok(resolveApi(snapshot,['sources',id],new URLSearchParams()));
});
test('constellation queries reject malformed times, locations and ambiguous filters',()=>{
  for(const q of ['', 'at=2026-02-30T22:00:00Z','at=2026-09-17T25:00:00Z','at=2026-09-17T22:00:00','at=2026-09-17T22:00:00%2B00:99','at=1900-01-01T00:00:00Z',at+'&at=2026-09-18T22:00:00Z',at+'&latitude=15.25',at+'&latitude=20&longitude=-23.15',at+'&aboveHorizon=yes',at+'&limit=0',at+'&offset=-1',at+'&constellationId=Orion',at+'&unknown=1']) assert.throws(()=>api(q),e=>e instanceof ApiError && e.status===400,q);
});
test('equivalent instants share calculations; conditional responses remain supported',async()=>{
  const a=api(at),b=api('at=2026-09-17T23:00:00Z');assert.equal(a.revision,b.revision);assert.deepEqual(a.records,b.records);
  assert.notEqual(a.revision,api(at+'&latitude=15.2&longitude=-23.2').revision);
  const r=jsonResponse(a,new Request('https://example.org'),a.revision);
  const cached=jsonResponse(a,new Request('https://example.org',{headers:{'If-None-Match':r.headers.get('etag')}}),a.revision);
  assert.equal(cached.status,304);assert.equal(await cached.text(),'');
});
