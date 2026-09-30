import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const commit=process.argv[2] || '7e720a3de062059d4c5400a379146a601d9010e0';
if(!/^[a-f0-9]{40}$/.test(commit)) throw Error('A full reviewed d3-celestial commit hash is required.');
const base=`https://raw.githubusercontent.com/ofrohn/d3-celestial/${commit}/`;
const files=['data/constellations.json','data/constellations.lines.json','readme.md','LICENSE'];
const downloaded=await Promise.all(files.map(async name=>{
  const r=await fetch(base+name,{signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error(`${name}: HTTP ${r.status}`);
  return [name,await r.text()];
}));
const raw=Object.fromEntries(downloaded);
const names=JSON.parse(raw[files[0]]),lines=JSON.parse(raw[files[1]]);
const position=c=>{
  if(!Array.isArray(c)||c.length!==2||!c.every(Number.isFinite)||Math.abs(c[0])>180||Math.abs(c[1])>90)throw Error('Invalid J2000 source position');
  return {rightAscensionHours:((c[0]+360)%360)/15,declinationDegrees:c[1]};
};
const groups=new Map();
for(const [index,f] of names.features.entries()) {
  if(!/^[A-Z][a-zA-Z]{2}$/.test(f.id)||!f.properties.la||f.geometry.type!=='Point')throw Error('Invalid constellation identity');
  const group=groups.get(f.id)||{id:f.id.toLowerCase(),abbreviation:f.id,name:f.properties.la,sourceRecordIds:[],referencePoints:[],figureStars:[]};
  if(group.name!==f.properties.la)throw Error('Inconsistent constellation identity');
  group.sourceRecordIds.push(`data/constellations.json#features/${index}`);
  group.referencePoints.push({name:f.properties.name,...position(f.geometry.coordinates)});
  groups.set(f.id,group);
}
for(const [index,f] of lines.features.entries()) {
  const group=groups.get(f.id);
  if(!group||f.geometry.type!=='MultiLineString')throw Error('Unmatched constellation figure');
  group.sourceRecordIds.push(`data/constellations.lines.json#features/${index}`);
  group.figureStars.push(...f.geometry.coordinates.flat().map(position));
}
const records=[...groups.values()].sort((a,b)=>a.id.localeCompare(b.id));
if(records.length!==88)throw Error('Expected 88 distinct constellations');
for(const r of records){r.figureStars=[...new Map(r.figureStars.map(p=>[JSON.stringify(p),p])).values()];if(!r.figureStars.length)throw Error(`Missing pattern: ${r.id}`);}
const checksums=Object.fromEntries(downloaded.map(([file,text])=>[file,createHash('sha256').update(text).digest('hex')]));
const data={sourceId:'d3-celestial-constellations',commit,url:`https://github.com/ofrohn/d3-celestial/tree/${commit}`,retrievedAt:new Date().toISOString(),sourceUpdatedAt:null,coordinateFrame:'J2000 equatorial',license:'BSD-3-Clause',attribution:'Copyright (c) 2015, Olaf Frohn. d3-celestial constellation names/figures; upstream IAU chart credits retained in bundled readme. Calculations use Astronomy Engine by Don Cross (MIT).',checksums,records};
const output=new URL('../data/astronomy/',import.meta.url);await mkdir(output,{recursive:true});
for(const [name,text] of downloaded)await writeFile(new URL(name.replaceAll('/','-'),output),text);
await writeFile(new URL('../data/constellation-catalog.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log(`Imported ${records.length} constellations at ${commit}; upstream bytes/checksums and license retained.`);
