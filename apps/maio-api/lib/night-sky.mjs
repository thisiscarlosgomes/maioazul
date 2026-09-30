import * as Astronomy from 'astronomy-engine';
import { createHash } from 'node:crypto';
const { Observer, SearchRiseSet, SearchAltitude, MoonPhase, Illumination, Body } = Astronomy;
export const nightSkyModel = {
  id: 'astronomy-engine', version: '2.1.19', contractVersion: '1',
  url: 'https://github.com/cosinekitty/astronomy',
  attribution: 'Calculated with Astronomy Engine by Don Cross (MIT). Not observed sky or weather data.',
  timezone: 'Atlantic/Cape_Verde', utcOffset: '-01:00',
};
export const nightSkyCaveats = [
  'Calculated astronomical events, not observations or a clear-sky forecast. Clouds, dust, light pollution and terrain obstruction are not modeled.',
  'Default location is the Maio reference point 15.25 N, 23.15 W, at assumed sea level; not a surveyed observing site. Optional coordinates must be inside the Maio bounding box, which also includes offshore locations.',
  'Rise/set uses the engine standard atmosphere and apparent limb convention. Twilight uses geometric solar-center altitudes -6, -12 and -18 degrees.',
  'Events belong to the stated local calendar date. Astronomical night runs from that evening to the following morning. Null means no event in the search interval, not midnight.',
  'Moon phase and illuminated fraction are geocentric values at local 22:00. They do not indicate whether the Moon is above the horizon.',
];
export function queryNightSky(params, error, now = new Date()) {
  const fail = message => { throw error(message); };
  const allowed = ['year','date','latitude','longitude','limit','offset'];
  for (const [key,value] of params) {
    if (!allowed.includes(key) || params.getAll(key).length !== 1 || value.length > 100) fail(`Invalid or duplicate query parameter: ${key}`);
  }
  const integer = (key, fallback, min, max) => {
    if (!params.has(key)) return fallback;
    const v=params.get(key);
    if (!/^\d+$/.test(v) || !Number.isSafeInteger(+v) || +v<min || +v>max) fail(`${key} must be an integer from ${min} to ${max}.`);
    return +v;
  };
  const date=params.get('date');
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date)) fail('date must be a valid YYYY-MM-DD date.');
  if (params.has('date') && !date) fail('date must be a valid YYYY-MM-DD date.');
  const year=integer('year',date ? +date.slice(0,4) : new Date(now.getTime()-3600000).getUTCFullYear(),2000,2100);
  if (year<2000 || year>2100 || (date && +date.slice(0,4)!==year)) fail('date and year must agree and be within 2000–2100.');
  if (params.has('latitude') !== params.has('longitude')) fail('Provide latitude and longitude together.');
  function coordinate(key,fallback,min,max) {
    if (!params.has(key)) return fallback;
    const value=params.get(key);
    if (!/^-?\d+(?:\.\d{1,6})?$/.test(value) || +value<min || +value>max) fail(`${key} must be within ${min} to ${max}, with at most 6 decimal places.`);
    return +value;
  }
  const latitude=coordinate('latitude',15.25,15.05,15.4), longitude=coordinate('longitude',-23.15,-23.3,-23.02);
  const limit=integer('limit',100,1,500),offset=integer('offset',0,0,Number.MAX_SAFE_INTEGER);
  const days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
  const dates=date ? [date] : Array.from({length:days},(_,i)=>new Date(Date.UTC(year,0,i+1)).toISOString().slice(0,10));
  const observer=new Observer(latitude,longitude,0);
  const revision=createHash('sha256').update(JSON.stringify({nightSkyModel,latitude,longitude,year})).digest('hex').slice(0,16);
  const records=dates.slice(offset,offset+limit).map(day=>{
    const start=new Date(`${day}T00:00:00-01:00`), end=new Date(+start+86400000);
    const iso=t=>t?.date.toISOString() ?? null;
    const rise=(body,direction)=>{ const t=SearchRiseSet(body,observer,direction,start,1);return t && +t.date<+end ? iso(t) : null; };
    const altitude=(direction,degrees,begin=start)=>iso(SearchAltitude(Body.Sun,observer,direction,begin,1,degrees));
    const evaluatedAt=new Date(`${day}T22:00:00-01:00`);
    const dusk=altitude(-1,-18), dawn=altitude(1,-18,end);
    const locationId=`${latitude}-${longitude}`.replaceAll('.','p');
    return { id:`night-sky-${locationId}-${day}`,date:day,sourceId:'astronomy-engine',sourceRecordId:null,
      dataKind:'calculated-ephemeris',sunrise:rise(Body.Sun,1),sunset:rise(Body.Sun,-1),
      civilDawn:altitude(1,-6),civilDusk:altitude(-1,-6),nauticalDawn:altitude(1,-12),nauticalDusk:altitude(-1,-12),
      astronomicalDawn:altitude(1,-18),astronomicalDusk:dusk,
      moonrise:rise(Body.Moon,1),moonset:rise(Body.Moon,-1),
      moon:{evaluatedAt:evaluatedAt.toISOString(),phaseAngleDegrees:MoonPhase(evaluatedAt),illuminatedFraction:Illumination(Body.Moon,evaluatedAt).phase_fraction},
      astronomicalNight:{start:dusk,end:dawn,durationSeconds:dusk && dawn ? Math.round((Date.parse(dawn)-Date.parse(dusk))/1000) : null},
    };
  });
  const link=n=>{const p=new URLSearchParams(params);p.set('year',String(year));p.set('limit',String(limit));p.set('offset',String(n));return `/api/v1/night-sky?${p}`;};
  return {revision,status:'available',dataKind:'calculated-ephemeris',year,timezone:nightSkyModel.timezone,utcOffset:nightSkyModel.utcOffset,
    location:{type:'Point',coordinates:[longitude,latitude]},assumedElevationMetres:0,
    model:nightSkyModel,sourceIds:['astronomy-engine'],sourceUpdatedAt:null,retrievedAt:null,
    caveats:nightSkyCaveats,numberMatched:dates.length,numberReturned:records.length,limit,offset,records,
    links:{constellations:'/api/v1/night-sky/constellations',self:link(offset),next:offset+limit<dates.length?link(offset+limit):null,previous:offset>0?link(Math.max(0,offset-limit)):null,source:'/api/v1/sources/astronomy-engine'}};
}
