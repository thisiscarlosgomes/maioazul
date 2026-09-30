import * as Astronomy from 'astronomy-engine';
import {createHash} from 'node:crypto';
import catalog from '../data/constellation-catalog.json' with {type:'json'};
import {nightSkyModel} from './night-sky.mjs';
export const constellationCatalog = catalog;
export const constellationContractVersion='1';
const contractVersion=constellationContractVersion;
export const constellationCaveats=[
  'Above-horizon status refers to the sourced star-pattern vertices, not the full official IAU constellation region or all stars within it.',
  'Altitude and direction are calculated for named chart reference points; these are label positions, not centroids or individual stars. Serpens has two reference points.',
  'J2000 catalogue directions are rotated to the observer horizon with precession and nutation. No stellar proper motion, refraction, terrain obstruction or extinction correction is applied.',
  'Above the geometric horizon does not mean visible to the eye. Sunlight, clouds, dust, Moon brightness and light pollution are not visibility predictions.',
];
export function queryConstellations(params,error) {
  const fail=message=>{throw error(message);};
  for(const [key,value] of params) if(!['at','latitude','longitude','aboveHorizon','constellationId','limit','offset'].includes(key)||params.getAll(key).length!==1||value.length>100)fail(`Invalid or duplicate query parameter: ${key}`);
  const at=params.get('at');
  const match=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(at||'');
  if(!match||+match[2]>23||+match[3]>59||+match[4]>59||+match[6]>23||+match[7]>59||!Number.isFinite(Date.parse(at))||new Date(`${match[1]}T00:00:00Z`).toISOString().slice(0,10)!==match[1])fail('at is required: a valid RFC 3339 instant with timezone, seconds and optional millisecond precision.');
  const time=new Date(at),localDate=new Date(+time-3600000).toISOString().slice(0,10);
  if(localDate<'2000-01-01'||localDate>'2100-12-31')fail('at must fall within local calendar years 2000–2100.');
  if(params.has('latitude')!==params.has('longitude'))fail('Provide latitude and longitude together.');
  const coordinate=(name,fallback,min,max)=>{
    if(!params.has(name))return fallback;
    const v=params.get(name);if(!/^-?\d+(?:\.\d{1,6})?$/.test(v)||+v<min||+v>max)fail(`${name} must be within ${min} to ${max}, with at most 6 decimals.`);return +v;
  };
  const latitude=coordinate('latitude',15.25,15.05,15.4),longitude=coordinate('longitude',-23.15,-23.3,-23.02);
  const integer=(key,fallback,min,max)=>{if(!params.has(key))return fallback;const v=params.get(key);if(!/^\d+$/.test(v)||!Number.isSafeInteger(+v)||+v<min||+v>max)fail(`${key} must be an integer from ${min} to ${max}.`);return +v;};
  const limit=integer('limit',100,1,500),offset=integer('offset',0,0,Number.MAX_SAFE_INTEGER);
  if(params.has('aboveHorizon')&&!['true','false'].includes(params.get('aboveHorizon')))fail('aboveHorizon must be true or false.');
  if(params.has('constellationId')&&!/^[a-z]{3}$/.test(params.get('constellationId')))fail('constellationId must be a lowercase three-letter abbreviation, for example ori.');
  const observer=new Astronomy.Observer(latitude,longitude,0);
  const rotation=Astronomy.Rotation_EQJ_HOR(time,observer);
  const horizontal=p=>{
    const vector=Astronomy.VectorFromSphere(new Astronomy.Spherical(p.declinationDegrees,p.rightAscensionHours*15,1),time);
    const h=Astronomy.HorizonFromVector(Astronomy.RotateVector(rotation,vector),null);
    const azimuthDegrees=Math.abs(h.lat)>89.99999999?null:h.lon;
    const compassDirection=azimuthDegrees===null?null:['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(azimuthDegrees/22.5)%16];
    return {altitudeDegrees:h.lat,azimuthDegrees,compassDirection,aboveHorizon:h.lat>0};
  };
  const records=catalog.records.filter(r=>!params.has('constellationId')||r.id===params.get('constellationId')).map(r=>{
    const altitudes=r.figureStars.map(p=>horizontal(p).altitudeDegrees),above=altitudes.filter(a=>a>0).length;
    return {id:r.id,abbreviation:r.abbreviation,name:r.name,sourceIds:[catalog.sourceId,'astronomy-engine'],sourceRecordIds:r.sourceRecordIds,
      referencePoints:r.referencePoints.map(p=>({...p,coordinateFrame:'J2000 equatorial',...horizontal(p)})),
      pattern:{starCount:altitudes.length,starsAboveHorizon:above,minimumAltitudeDegrees:Math.min(...altitudes),maximumAltitudeDegrees:Math.max(...altitudes),horizonStatus:above===0?'below-horizon':above===altitudes.length?'all-pattern-stars-above':'some-pattern-stars-above'},
      aboveHorizon:above>0};
  }).filter(r=>!params.has('aboveHorizon')||r.aboveHorizon===(params.get('aboveHorizon')==='true'));
  const solar=Astronomy.Equator(Astronomy.Body.Sun,time,observer,true,true);
  const sunAltitude=Astronomy.Horizon(time,observer,solar.ra,solar.dec,null).altitude;
  const revision=createHash('sha256').update(JSON.stringify({nightSkyModel,contractVersion,checksums:catalog.checksums,at:time.toISOString(),latitude,longitude})).digest('hex').slice(0,16);
  const link=n=>{const q=new URLSearchParams(params);q.set('at',time.toISOString());q.set('limit',String(limit));q.set('offset',String(n));return `/api/v1/night-sky/constellations?${q}`;};
  return {revision,status:'available',dataKind:'calculated-ephemeris',at:time.toISOString(),localDate,timezone:nightSkyModel.timezone,utcOffset:nightSkyModel.utcOffset,
    location:{type:'Point',coordinates:[longitude,latitude]},assumedElevationMetres:0,
    sunAltitudeDegrees:sunAltitude,isAstronomicalDarkness:sunAltitude< -18,
    positionBasis:'sourced-chart-reference-points',horizonBasis:'sourced-pattern-star-vertices',
    model:{...nightSkyModel,constellationContractVersion:contractVersion},
    sourceIds:[catalog.sourceId,'astronomy-engine'],sourceUpdatedAt:null,retrievedAt:catalog.retrievedAt,catalogCommit:catalog.commit,caveats:constellationCaveats,
    numberMatched:records.length,numberReturned:records.slice(offset,offset+limit).length,limit,offset,records:records.slice(offset,offset+limit),
    links:{self:link(offset),next:offset+limit<records.length?link(offset+limit):null,previous:offset>0?link(Math.max(0,offset-limit)):null,source:`/api/v1/sources/${catalog.sourceId}`}};
}
