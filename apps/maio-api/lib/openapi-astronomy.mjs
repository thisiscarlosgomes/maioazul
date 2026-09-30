const ref=name=>({$ref:`#/components/schemas/${name}`});
const object=properties=>({type:'object',required:Object.keys(properties),properties});
export function astronomyOpenapi(spec) {
  const text={type:'string'},strings={type:'array',items:text},nullable={type:['string','null']},instant={type:['string','null'],format:'date-time'};
  const metadata={revision:text,status:{const:'available'},dataKind:{const:'calculated-ephemeris'},date:{type:'string',format:'date'},time:{type:'string',pattern:'^([01][0-9]|2[0-3]):[0-5][0-9]$'},at:{type:'string',format:'date-time'},timezone:{const:'Atlantic/Cape_Verde'},utcOffset:{const:'-01:00'},location:ref('Point'),assumedElevationMetres:{const:0},model:ref('NightSkyModel'),sourceIds:strings,sourceUpdatedAt:instant,retrievedAt:instant,caveats:strings};
  const planned={revision:text,status:{const:'planned'},sourceIds:{type:'array',maxItems:0,items:text},updatedAt:{type:'null'},retrievedAt:{type:'null'},caveats:strings};
  const count={type:'integer',minimum:0},limit={type:'integer',minimum:1,maximum:500};
  const schemas=spec.components.schemas;
  const bodyPosition=object({altitudeDegrees:{type:'number',minimum:-90,maximum:90},azimuthDegrees:{type:['number','null'],minimum:0,exclusiveMaximum:360,description:'Geometric direction, degrees clockwise from north. Null at zenith/nadir.'},aboveHorizon:{type:'boolean'}});
  Object.assign(schemas,{
    AstronomyCapability:object({id:text,status:{enum:['available','planned']},description:text,href:text}),
    AstronomyDomain:object({revision:text,name:text,status:{const:'available'},timezone:{const:'Atlantic/Cape_Verde'},utcOffset:{const:'-01:00'},supportedYears:object({from:{const:2000},to:{const:2100}}),defaultLocalTime:{const:'22:00'},capabilities:{type:'array',items:ref('AstronomyCapability')},caveats:strings,links:object({self:text,page:text,legacyAlmanac:text,legacyConstellations:text})}),
    AstronomyBodyPosition:bodyPosition,
    AstronomyMoon:object({...bodyPosition.properties,...schemas.NightSkyMoon.properties,moonrise:instant,moonset:instant}),
    AstronomySolarEvents:object(Object.fromEntries(Object.entries(schemas.NightSkyDay.properties).filter(([key])=>['sunrise','sunset','civilDawn','civilDusk','nauticalDawn','nauticalDusk','astronomicalDawn','astronomicalDusk','astronomicalNight'].includes(key)))),
    AstronomyResourceLinks:object({self:text,sources:strings}),
    AstronomyMoonResponse:object({...metadata,moon:ref('AstronomyMoon'),links:ref('AstronomyResourceLinks')}),
    AstronomySky:object({...metadata,sun:ref('AstronomyBodyPosition'),moon:ref('AstronomyMoon'),solarEvents:ref('AstronomySolarEvents'),isAstronomicalDarkness:{type:'boolean'},constellationCount:count,constellations:{type:'array',items:ref('ConstellationPosition')},links:ref('AstronomyResourceLinks')}),
    AstronomyConstellationDay:object({date:{type:'string',format:'date'},at:{type:'string',format:'date-time'},sunAltitudeDegrees:{type:'number',minimum:-90,maximum:90},isAstronomicalDarkness:{type:'boolean'},constellationCount:count,constellations:{type:'array',items:ref('ConstellationPosition')}}),
    PlannedAstronomyPage:object({...planned,numberMatched:{const:0},numberReturned:{const:0},limit,offset:count,records:{type:'array',maxItems:0,items:{}},links:ref('PaginationLinks')}),
    StargazingScore:object({...planned,date:{type:['string','null'],format:'date'},time:nullable,at:instant,location:{oneOf:[{type:'null'},ref('Point')]},score:{type:'null',description:'No scoring methodology or suitable live inputs are connected.'},scale:{type:'null'},methodology:{type:'null'},requiredInputs:strings,links:object({self:text})}),
  });
  const {date,time,at,...monthMetadata}=metadata;
  schemas.AstronomyConstellationPage=object({...monthMetadata,year:{type:'integer',minimum:2000,maximum:2100},month:{type:'integer',minimum:1,maximum:12},time,numberMatched:count,numberReturned:count,limit,offset:count,records:{type:'array',items:ref('AstronomyConstellationDay')},links:ref('PaginationLinks')});
  schemas.SourceContract.properties.links.properties.astronomy=text;
  schemas.CalculationDomain.properties.aliasOf=text;
  const param=(name,description,schema,required=false)=>({name,in:'query',description,schema,required});
  const dateParam=param('date','Local calendar date in Cape Verde (2000–2100).',{type:'string',format:'date'},true);
  const timeParam=param('time','Local HH:MM in Atlantic/Cape_Verde, UTC−01:00. Defaults to 22:00.',{...time,default:'22:00'});
  const coords=spec.paths['/night-sky'].get.parameters.filter(p=>['latitude','longitude'].includes(p.name));
  const filters=spec.paths['/night-sky/constellations'].get.parameters.filter(p=>['aboveHorizon','constellationId'].includes(p.name)).map(p=>p.name==='aboveHorizon'?{...p,description:'Default true: at least one sourced pattern star above the horizon. False selects patterns with none above.',schema:{type:'boolean',default:true}}:p);
  const pages=[param('limit','Page size; for constellation queries pagination counts days.',{...limit,default:100}),param('offset','Zero-based offset; constellation days are in ascending local-date order.',{...count,default:0})];
  const year=param('year','Year, 2000–2100. Constellation month queries default to current Cape Verde year.',{type:'integer',minimum:2000,maximum:2100});
  const month=param('month','Calendar month, 1–12. For constellations provide month (+ optional year) OR date.',{type:'integer',minimum:1,maximum:12});
  const operation=(id,summary,schema,parameters=[])=>{
    const op=structuredClone(spec.paths['/night-sky'].get);op.operationId=id;op.summary=summary;
    op.parameters=[...parameters,{name:'If-None-Match',in:'header',schema:text}];
    op.responses[200].content={'application/json':{schema:ref(schema)}};
    op.responses[200].headers['X-Data-Revision'].description='Calculation or capability revision returned in the response body.';
    return {get:op};
  };
  Object.assign(spec.paths,{
    '/astronomy':operation('getAstronomy','Discover available astronomy capabilities and explicitly planned feeds','AstronomyDomain'),
    '/astronomy/sky':operation('getAstronomySky','Sun, Moon and constellation snapshot at a local date and time','AstronomySky',[dateParam,timeParam,...coords,...filters]),
    '/astronomy/moon':operation('getAstronomyMoon','Moon phase and geometric position at the requested time; rise/set for that local date','AstronomyMoonResponse',[dateParam,timeParam,...coords]),
    '/astronomy/constellations':operation('getAstronomyConstellations','One constellation sample per day for a month or a single date; not whole-month continuous visibility','AstronomyConstellationPage',[{...dateParam,required:false},month,year,timeParam,...coords,...filters,...pages]),
    '/astronomy/meteor-showers':operation('getAstronomyMeteorShowers','Planned: no reviewed meteor catalogue or year-specific predictions connected','PlannedAstronomyPage',[year,month,...pages]),
    '/astronomy/dark-sky-spots':operation('getAstronomyDarkSkySpots','Planned: no verified stargazing-site inventory connected','PlannedAstronomyPage',pages),
    '/astronomy/stargazing-score':operation('getAstronomyStargazingScore','Planned: null score until methodology and suitable live inputs are connected','StargazingScore',[{...dateParam,required:false},timeParam,...coords]),
  });
  schemas.SkyMapPoint=object({az:{type:'number',minimum:0,exclusiveMaximum:360},alt:{type:'number',minimum:-90,maximum:90}});
  schemas.SkyMapConstellation=object({id:text,name:text,abbreviation:text,paths:{type:'array',minItems:1,items:{type:'array',minItems:2,items:ref('SkyMapPoint')}},center:ref('SkyMapPoint'),highest:ref('SkyMapPoint'),above:{type:'boolean'},count:{type:'integer',minimum:1}});
  schemas.AstronomySkyMap=object({revision:text,status:{const:'available'},dataKind:{const:'calculated-ephemeris'},at:{type:'string',format:'date-time'},location:ref('Point'),assumedElevationMetres:{const:0},model:ref('NightSkyModel'),sourceIds:strings,catalogCommit:text,retrievedAt:{type:'string',format:'date-time'},coordinateFrame:{const:'observer-horizon'},caveats:strings,sunAltitude:{type:'number',minimum:-90,maximum:90},constellations:{type:'array',minItems:88,maxItems:88,items:ref('SkyMapConstellation')},links:ref('AstronomyResourceLinks')});
  spec.paths['/astronomy/sky-map']=operation('getAstronomySkyMap','Worldwide star-pattern geometry for the stargazing app; all 88 constellations','AstronomySkyMap',[
    param('at','RFC 3339 instant with seconds and timezone, UTC years 2000–2100.',{type:'string',format:'date-time'},true),
    param('latitude','Observer latitude; provide together with longitude; up to six decimal places.',{type:'number',minimum:-90,maximum:90,default:15.25}),
    param('longitude','Observer longitude; provide together with latitude; up to six decimal places.',{type:'number',minimum:-180,maximum:180,default:-23.15}),
  ]);
  spec.paths['/astronomy/almanac']=structuredClone(spec.paths['/night-sky']);
  spec.paths['/astronomy/almanac'].get.operationId='getAstronomyAlmanac';
  spec.paths['/astronomy/almanac'].get.summary='Canonical full-year Sun/Moon almanac; existing /night-sky remains compatible';
  return spec;
}
