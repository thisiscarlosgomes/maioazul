import * as Astronomy from 'astronomy-engine';
import {createHash} from 'node:crypto';
import {queryNightSky,nightSkyModel,nightSkyCaveats} from './night-sky.mjs';
import {queryConstellations,constellationCatalog,constellationCaveats,constellationContractVersion} from './constellations.mjs';
import {querySkyMap} from './sky-map.mjs';
const base='/api/v1/astronomy';
const contractVersion='1';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,16);
const nowYear=()=>new Date(Date.now()-3600000).getUTCFullYear();
const sourceLinks=ids=>ids.map(id=>`/api/v1/sources/${id}`);
function validate(params,allowed,fail) {
  for(const [key,value] of params) if(!allowed.includes(key)||params.getAll(key).length!==1||value.length>100)fail(`Invalid or duplicate query parameter: ${key}`);
}
function integer(params,key,fallback,min,max,fail) {
  if(!params.has(key))return fallback;
  const v=params.get(key);
  if(!/^\d+$/.test(v)||!Number.isSafeInteger(+v)||+v<min||+v>max)fail(`${key} must be an integer from ${min} to ${max}.`);
  return +v;
}
function localTime(params,fail) {
  const time=params.get('time')??'22:00';
  if(!/^\d{2}:\d{2}$/.test(time)||+time.slice(0,2)>23||+time.slice(3)>59)fail('time must be a local HH:MM time in Atlantic/Cape_Verde.');
  return time;
}
function localDate(value,fail) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||'')||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value||value<'2000-01-01'||value>'2100-12-31')fail('date must be a valid local YYYY-MM-DD date in 2000–2100.');
  return value;
}
function observerLocation(params,fail) {
  if(params.has('latitude')!==params.has('longitude'))fail('Provide latitude and longitude together.');
  const coordinate=(key,fallback,min,max)=>{if(!params.has(key))return fallback;const v=params.get(key);if(!/^-?\d+(?:\.\d{1,6})?$/.test(v)||+v<min||+v>max)fail(`${key} must be within ${min} to ${max}, with at most 6 decimals.`);return +v;};
  return {latitude:coordinate('latitude',15.25,15.05,15.4),longitude:coordinate('longitude',-23.15,-23.3,-23.02)};
}
function context(params,fail) {
  const date=localDate(params.get('date'),fail),time=localTime(params,fail);
  return {date,time,at:new Date(`${date}T${time}:00-01:00`).toISOString(),...observerLocation(params,fail)};
}
function envelope(ctx,sourceIds,extra={}) {
  return {status:'available',dataKind:'calculated-ephemeris',date:ctx.date,time:ctx.time,at:ctx.at,
    timezone:nightSkyModel.timezone,utcOffset:nightSkyModel.utcOffset,location:{type:'Point',coordinates:[ctx.longitude,ctx.latitude]},assumedElevationMetres:0,
    model:{...nightSkyModel,astronomyContractVersion:contractVersion},sourceIds,sourceUpdatedAt:null,retrievedAt:sourceIds.includes(constellationCatalog.sourceId)?constellationCatalog.retrievedAt:null,...extra};
}
function bodyPosition(body,ctx) {
  const observer=new Astronomy.Observer(ctx.latitude,ctx.longitude,0),at=new Date(ctx.at);
  const eq=Astronomy.Equator(body,at,observer,true,true),position=Astronomy.Horizon(at,observer,eq.ra,eq.dec,null);
  return {altitudeDegrees:position.altitude,azimuthDegrees:Math.abs(position.altitude)>89.99999999?null:position.azimuth,aboveHorizon:position.altitude>0};
}
function daily(ctx,error) {
  return queryNightSky(new URLSearchParams({date:ctx.date,latitude:String(ctx.latitude),longitude:String(ctx.longitude),limit:'1'}),error).records[0];
}
function moon(ctx,day) {
  return {...bodyPosition(Astronomy.Body.Moon,ctx),evaluatedAt:ctx.at,phaseAngleDegrees:Astronomy.MoonPhase(new Date(ctx.at)),illuminatedFraction:Astronomy.Illumination(Astronomy.Body.Moon,new Date(ctx.at)).phase_fraction,
    moonrise:day.moonrise,moonset:day.moonset};
}
function constellationParams(params,ctx) {
  const q=new URLSearchParams({at:ctx.at,latitude:String(ctx.latitude),longitude:String(ctx.longitude),aboveHorizon:params.get('aboveHorizon')??'true',limit:'100'});
  if(params.has('constellationId'))q.set('constellationId',params.get('constellationId'));
  return q;
}
const calculationCaveats=[...nightSkyCaveats.filter(x=>!x.startsWith('Moon phase')),'Moon phase and illumination are evaluated at the requested local time. Body altitude is geometric (no refraction), while rise/set events use the standard engine horizon convention.'];
function page(params,path,items,extra,fail) {
  const limit=integer(params,'limit',100,1,500,fail),offset=integer(params,'offset',0,0,Number.MAX_SAFE_INTEGER,fail);
  const link=n=>{const p=new URLSearchParams(params);p.set('limit',String(limit));p.set('offset',String(n));return `${path}?${p}`;};
  return {...extra,numberMatched:items.length,numberReturned:items.slice(offset,offset+limit).length,limit,offset,records:items.slice(offset,offset+limit),links:{self:link(offset),next:offset+limit<items.length?link(offset+limit):null,previous:offset>0?link(Math.max(0,offset-limit)):null}};
}
const capabilities=[
  ['sky-map','available','Worldwide, timestamped constellation line geometry for the stargazing app.'],
  ['sky','available','Sun, Moon and constellation snapshot at a local date/time.'],
  ['constellations','available','Daily constellation views for a month, or one specified date, at a fixed local time.'],
  ['moon','available','Moon phase, illumination, horizon position and local-date rise/set.'],
  ['almanac','available','Full-year Sun/Moon almanac; same calculations as the existing night-sky endpoint.'],
  ['meteor-showers','planned','No reviewed meteor-shower catalogue or year-specific predictions are connected.'],
  ['dark-sky-spots','planned','No verified observing-site inventory, light-pollution assessment or access information is connected.'],
  ['stargazing-score','planned','No defined scoring methodology or suitable current weather/light-pollution inputs are connected.'],
].map(([id,status,description])=>({id,status,description,href:`${base}/${id}`}));
export function resolveAstronomy(snapshot,segments,params,error) {
  const fail=message=>{throw error(400,message);};
  const error400=message=>error(400,message);
  const resource=segments[1];
  if(segments.length===1) {
    validate(params,[],fail);
    return {revision:hash({snapshot:snapshot.revision,contractVersion,capabilities}),name:'Maio Astronomy',status:'available',timezone:nightSkyModel.timezone,utcOffset:nightSkyModel.utcOffset,supportedYears:{from:2000,to:2100},defaultLocalTime:'22:00',capabilities,
      caveats:['Calculated astronomy is distinct from observed visibility. Planned resources contain no fabricated records or scores.','Constellation month queries return daily samples, not a single claim that applies all month.'],links:{self:base,page:'/night-sky',legacyAlmanac:'/api/v1/night-sky',legacyConstellations:'/api/v1/night-sky/constellations'}};
  }
  if(segments.length!==2||!capabilities.some(c=>c.id===resource))throw error(404,'Astronomy endpoint not found.');
  if(resource==='sky-map') return querySkyMap(params,error);
  if(resource==='almanac') {
    const result=queryNightSky(params,error400);
    return {...result,links:Object.fromEntries(Object.entries(result.links).map(([key,value])=>[key,typeof value==='string'?value.replace('/api/v1/night-sky?',`${base}/almanac?`).replace('/api/v1/night-sky/constellations',`${base}/constellations`):value]))};
  }
  if(['sky','moon'].includes(resource)) {
    validate(params,['date','time','latitude','longitude',...(resource==='sky'?['aboveHorizon','constellationId']:[])],fail);
    const ctx=context(params,fail),day=daily(ctx,error400),lunar=moon(ctx,day);
    const query=new URLSearchParams(params);query.set('time',ctx.time);
    if(resource==='moon')return envelope(ctx,['astronomy-engine'],{revision:hash({contractVersion,nightSkyModel,ctx}),moon:lunar,caveats:calculationCaveats,
      links:{self:`${base}/moon?${query}`,sources:sourceLinks(['astronomy-engine'])}});
    const stars=queryConstellations(constellationParams(params,ctx),error400);
    const {moon:unusedMoon,moonrise,moonset,id,sourceId,sourceRecordId,dataKind,date,...solarEvents}=day;
    return envelope(ctx,stars.sourceIds,{revision:hash({contractVersion,nightRevision:stars.revision,ctx}),sun:bodyPosition(Astronomy.Body.Sun,ctx),moon:lunar,solarEvents,
      isAstronomicalDarkness:stars.isAstronomicalDarkness,constellations:stars.records,constellationCount:stars.numberReturned,
      caveats:[...calculationCaveats,...constellationCaveats],links:{self:`${base}/sky?${query}`,sources:sourceLinks(stars.sourceIds)}});
  }
  if(resource==='constellations') {
    validate(params,['date','month','year','time','latitude','longitude','aboveHorizon','constellationId','limit','offset'],fail);
    if(params.has('date')&&(params.has('month')||params.has('year')))fail('Use date OR month/year, not both.');
    if(!params.has('date')&&!params.has('month'))fail('Provide a month (1–12) or a local date.');
    const time=localTime(params,fail),location=observerLocation(params,fail);
    const limit=integer(params,'limit',100,1,500,fail),offset=integer(params,'offset',0,0,Number.MAX_SAFE_INTEGER,fail);
    const date=params.has('date')?localDate(params.get('date'),fail):null;
    const year=date?+date.slice(0,4):integer(params,'year',nowYear(),2000,2100,fail),month=date?+date.slice(5,7):integer(params,'month',null,1,12,fail);
    const dates=date?[date]:Array.from({length:new Date(Date.UTC(year,month,0)).getUTCDate()},(_,i)=>`${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`);
    // Validate filters even when the requested page is empty.
    if(params.has('aboveHorizon')&&!['true','false'].includes(params.get('aboveHorizon')))fail('aboveHorizon must be true or false.');
    if(params.has('constellationId')&&!/^[a-z]{3}$/.test(params.get('constellationId')))fail('constellationId must be a lowercase three-letter abbreviation.');
    const rows=dates.slice(offset,offset+limit).map(date=>{
      const ctx={date,time,at:new Date(`${date}T${time}:00-01:00`).toISOString(),...location};
      const stars=queryConstellations(constellationParams(params,ctx),error400);
      return {date,at:stars.at,sunAltitudeDegrees:stars.sunAltitudeDegrees,isAstronomicalDarkness:stars.isAstronomicalDarkness,constellationCount:stars.numberMatched,constellations:stars.records};
    });
    const query=new URLSearchParams(params);query.set('time',time);query.set('aboveHorizon',params.get('aboveHorizon')??'true');if(!date)query.set('year',String(year));
    const link=n=>{const p=new URLSearchParams(query);p.set('limit',String(limit));p.set('offset',String(n));return `${base}/constellations?${p}`;};
    return {revision:hash({contractVersion,nightSkyModel,constellationContractVersion,catalog:constellationCatalog.checksums,year,month,date,time,location}),status:'available',dataKind:'calculated-ephemeris',year,month,time,timezone:nightSkyModel.timezone,utcOffset:nightSkyModel.utcOffset,
      location:{type:'Point',coordinates:[location.longitude,location.latitude]},assumedElevationMetres:0,model:{...nightSkyModel,astronomyContractVersion:contractVersion},
      sourceIds:[constellationCatalog.sourceId,'astronomy-engine'],sourceUpdatedAt:null,retrievedAt:constellationCatalog.retrievedAt,
      caveats:['One sample per local calendar day at the requested time; not continuous visibility during the month. Pagination counts days, not constellations.',...constellationCaveats],
      numberMatched:dates.length,numberReturned:rows.length,limit,offset,records:rows,links:{self:link(offset),next:offset+limit<dates.length?link(offset+limit):null,previous:offset>0?link(Math.max(0,offset-limit)):null}};
  }
  const reason=capabilities.find(c=>c.id===resource).description;
  const metadata={revision:hash({snapshot:snapshot.revision,contractVersion,resource}),status:'planned',sourceIds:[],updatedAt:null,retrievedAt:null,caveats:[reason]};
  if(resource==='stargazing-score') {
    validate(params,['date','time','latitude','longitude'],fail);
    const ctx=params.has('date')?context(params,fail):null;
    if(!ctx&&(params.has('time')||params.has('latitude')||params.has('longitude')))fail('Provide date with time or observer coordinates.');
    return {...metadata,date:ctx?.date??null,time:ctx?.time??null,at:ctx?.at??null,location:ctx?{type:'Point',coordinates:[ctx.longitude,ctx.latitude]}:null,
      score:null,scale:null,methodology:null,requiredInputs:['documented-scoring-method','current-cloud-cover','atmospheric-transparency','light-pollution','verified-site-horizon','sun-and-moon-conditions'],links:{self:`${base}/${resource}${params.size?`?${params}`:''}`}};
  }
  validate(params,resource==='meteor-showers'?['year','month','limit','offset']:['limit','offset'],fail);
  const query=new URLSearchParams(params);
  if(resource==='meteor-showers'){
    if(params.has('month'))integer(params,'month',null,1,12,fail);
    if(params.has('year'))integer(params,'year',null,2000,2100,fail);
  }
  return page(query,`${base}/${resource}`,[],metadata,fail);
}
