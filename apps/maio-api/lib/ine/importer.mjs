import {createHash} from 'node:crypto';
export const supportedDatasets=['population','households','housing','employment','education','demographic-indicators'];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function check(condition,message){if(!condition)throw Error(`INE import: ${message}`);}
function text(v,name){check(typeof v==='string'&&v.trim().length>0,`${name} must be nonempty text`);}
function keys(obj,allowed,name){check(obj&&typeof obj==='object'&&!Array.isArray(obj),`${name} must be an object`);for(const k of Object.keys(obj))check(allowed.includes(k),`${name}: unexpected field ${k}`);}
function date(v,name){
 if(v===null)return;
 check(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(v)&&Number.isFinite(Date.parse(v)),`${name} must be a source date/timestamp or null`);
 check(new Date(v.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)===v.slice(0,10),`${name} is an impossible calendar date`);
}
function strings(v,name){check(Array.isArray(v)&&v.every(x=>typeof x==='string'),`${name} must be a text array`);}
export function normalizeINE(input,knownPlaces=[]) {
 keys(input,['source','crosswalk','statistics','geography'],'package');
 const s=input.source;
 keys(s,['id','title','url','publisher','license','licenseUrl','updatedAt','retrievedAt','referencePeriod','dataClass','review'],'source');
 for(const k of ['id','title','url','publisher','license','referencePeriod'])text(s[k],`source.${k}`);
 check(/^ine-[a-z0-9-]+$/.test(s.id),'source.id must be a stable ine- slug');
 const url=new URL(s.url);check(url.protocol==='https:'&&!url.username&&!url.password&&(url.hostname==='ine.cv'||url.hostname.endsWith('.ine.cv')),'source URL must identify an HTTPS INE publication');
 check(s.publisher==='INE Cabo Verde','publisher must be INE Cabo Verde');
 check(s.dataClass==='aggregate','only published aggregate tables/geographies are accepted; never census microdata');
 keys(s.review,['status','reviewedAt'],'review');check(s.review.status==='verified','publication provenance and transcription must be verified before import');date(s.review.reviewedAt,'reviewedAt');check(s.review.reviewedAt!==null,'reviewedAt is required');
 date(s.updatedAt,'updatedAt');date(s.retrievedAt,'retrievedAt');check(s.licenseUrl===null||typeof s.licenseUrl==='string','licenseUrl must be text or null');
 check(Array.isArray(input.crosswalk)&&Array.isArray(input.statistics)&&Array.isArray(input.geography),'crosswalk, statistics and geography must be arrays');
 const crosswalk=new Map(),places=new Set(knownPlaces.map(p=>p.id));
 for(const c of input.crosswalk){
  keys(c,['code','level','geographicScope','locality','placeId','evidence'],'crosswalk');
  for(const k of ['code','geographicScope','evidence'])text(c[k],`crosswalk.${k}`);
  check(['island','municipality','parish','locality','statistical-area'].includes(c.level),'unrecognized geographic level');
  check(!crosswalk.has(c.code),'duplicate geographic code');
  check(c.locality===null||typeof c.locality==='string','locality must be text or null');
  check(c.placeId===null||places.has(c.placeId),'placeId must be an explicitly reviewed existing place or null');
  if(c.placeId!==null)check(c.level==='locality','only locality-level statistics may be linked to a locality Place');
  crosswalk.set(c.code,c);
 }
 const source={id:s.id,title:s.title,url:s.url,attribution:s.publisher,license:s.license,licenseUrl:s.licenseUrl,sourceUpdatedAt:s.updatedAt,retrievedAt:s.retrievedAt,referencePeriod:s.referencePeriod,checksum:hash(input),excludedOutsideExtent:0};
 const seen=new Set(),records=[],features=[],placeLinks=[];
 function identity(kind,id){text(id,'sourceRecordId');const result=`${s.id}-${kind}-${Buffer.from(id, 'utf8').toString('base64url')}`;check(!seen.has(result),`duplicate source record ${id}`);seen.add(result);return result;}
 function area(code){text(code,'geographicCode');const c=crosswalk.get(code);check(c,`unmapped geographic code ${code}`);return c;}
 for(const r of input.statistics){
  keys(r,['sourceRecordId','datasetId','geographicCode','year','referencePeriod','indicator','value','valueStatus','unit','dimensions','caveats'],'statistical row');
  check(supportedDatasets.includes(r.datasetId),'unsupported statistical dataset');const c=area(r.geographicCode);
  check(Number.isInteger(r.year)&&r.year>=1900&&r.year<=9999,'year must be explicit');
  for(const k of ['referencePeriod','indicator','unit'])text(r[k],k);
  check(['reported','missing','suppressed','not-applicable'].includes(r.valueStatus),'invalid valueStatus');
  check(r.valueStatus==='reported'?(typeof r.value==='number'&&Number.isFinite(r.value)):r.value===null,'reported values must be finite numbers; missing/suppressed values must be null');
  keys(r.dimensions,Object.keys(r.dimensions||{}),'dimensions');check(Object.values(r.dimensions).every(v=>typeof v==='string'),'dimension values must be explicit source labels/codes');strings(r.caveats,'caveats');
  records.push({id:identity('record',r.sourceRecordId),datasetId:r.datasetId,sourceRecordId:r.sourceRecordId,sourceId:s.id,year:r.year,referencePeriod:r.referencePeriod,geographicCode:r.geographicCode,geographicScope:c.geographicScope,locality:c.locality,placeId:c.placeId,indicator:r.indicator,value:r.value,valueStatus:r.valueStatus,unit:r.unit,dimensions:Object.fromEntries(Object.entries(r.dimensions).sort()),updatedAt:s.updatedAt,retrievedAt:s.retrievedAt,quality:'source-verified',caveats:r.caveats});
 }
 for(const f of input.geography){
  keys(f,['sourceRecordId','geographicCode','collection','name','crs','geometry','caveats'],'geography');
  check(['admin-boundaries','localities'].includes(f.collection),'unsupported geographic collection');
  const c=area(f.geographicCode);text(f.name,'geographic name');check(f.crs==='OGC:CRS84','geometry must be explicitly transformed to WGS84 longitude/latitude before import');
  keys(f.geometry,['type','coordinates'],'geometry');
  check((f.collection==='localities'?['Point','Polygon','MultiPolygon']:['Polygon','MultiPolygon']).includes(f.geometry.type),'invalid geometry type');
  const points=[];
  const position=p=>{check(Array.isArray(p)&&p.length===2&&p.every(Number.isFinite),'invalid position');check(p[0]>=-23.3&&p[0]<=-23.02&&p[1]>=15.05&&p[1]<=15.4,'coordinate outside Maio import extent; review CRS/coverage');points.push(p);};
  const ring=r=>{check(Array.isArray(r)&&r.length>=4,'invalid polygon ring');r.forEach(position);check(r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1],'polygon rings must be closed');};
  const polygon=p=>{check(Array.isArray(p)&&p.length>0,'empty polygon');p.forEach(ring);};
  if(f.geometry.type==='Point')position(f.geometry.coordinates);
  else if(f.geometry.type==='Polygon')polygon(f.geometry.coordinates);
  else {check(Array.isArray(f.geometry.coordinates)&&f.geometry.coordinates.length>0,'empty multipolygon');f.geometry.coordinates.forEach(polygon);}
  strings(f.caveats,'geographic caveats');const id=identity('feature',f.sourceRecordId);
  features.push({type:'Feature',id,geometry:f.geometry,bbox:points.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]),properties:{name:f.name,collections:[f.collection],sourceIds:[s.id],sourceRecordId:f.sourceRecordId,preferredSourceId:s.id,geometrySourceId:s.id,geometryStatus:'available',recordType:'official-geography',attributes:{geographicCode:f.geographicCode,geographicScope:c.geographicScope,level:c.level,referencePeriod:s.referencePeriod,caveats:f.caveats}}});
  if(c.placeId&&f.collection==='localities')placeLinks.push({placeId:c.placeId,featureId:id,basis:c.evidence});
 }
 return {source,records,features,placeLinks};
}

export function applyINE(imported,{sources,datasets,features,registry}) {
 check(!sources.some(s=>s.id===imported.source.id),'duplicate source ID across imports');
 sources.push(imported.source);
 for(const feature of imported.features){check(!features.has(feature.id),'feature ID collision');features.set(feature.id,feature);}
 for(const datasetId of new Set(imported.records.map(r=>r.datasetId))){
  let dataset=datasets.find(d=>d.id===datasetId);
  if(!dataset){dataset={id:datasetId,title:'Demographic indicators',scope:'Maio',license:imported.source.license,sourceIds:[],records:[],updatedAt:null,retrievedAt:null,sourceUpdatedAt:null,caveats:[]};datasets.push(dataset);}
  const added=imported.records.filter(r=>r.datasetId===datasetId).map(({datasetId,...r})=>r);
  check(!added.some(r=>dataset.records.some(old=>old.id===r.id)),'record ID collision');
  dataset.records.push(...added);dataset.records.sort((a,b)=>a.id.localeCompare(b.id));dataset.sourceIds.push(imported.source.id);
  dataset.license=dataset.sourceIds.length===1?imported.source.license:'See source-specific licensing';
  dataset.status='available';dataset.recordsStatus='available';dataset.payload={records:dataset.records};dataset.checksum=hash(dataset.payload);
  dataset.caveats=['Published aggregate source data. Preserve dimensions, reference periods, suppressed/missing values and source-specific reuse terms.'];
 }
 for(const link of imported.placeLinks){const p=registry.find(p=>p.id===link.placeId);check(p,'unknown Place');p.relatedFeatures=[...(p.relatedFeatures||[]),{featureId:link.featureId,basis:link.basis}];}
}
