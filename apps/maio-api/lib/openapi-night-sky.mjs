const ref=name=>({$ref:`#/components/schemas/${name}`});
const object=properties=>({type:'object',properties,required:Object.keys(properties)});
export function nightSkyOpenapi(spec) {
  const text={type:'string'}, instant={type:['string','null'],format:'date-time'};
  const events=['sunrise','sunset','civilDawn','civilDusk','nauticalDawn','nauticalDusk','astronomicalDawn','astronomicalDusk','moonrise','moonset'];
  Object.assign(spec.components.schemas,{
    NightSkyMoon:object({evaluatedAt:{type:'string',format:'date-time'},phaseAngleDegrees:{type:'number',minimum:0,maximum:360,description:'Geocentric ecliptic phase: 0 new, 90 first quarter, 180 full, 270 last quarter.'},illuminatedFraction:{type:'number',minimum:0,maximum:1}}),
    AstronomicalNight:object({start:instant,end:instant,durationSeconds:{type:['integer','null'],minimum:0}}),
    NightSkyDay:object({id:ref('ResourceId'),date:{type:'string',format:'date'},sourceId:{const:'astronomy-engine'},sourceRecordId:{type:'null'},dataKind:{const:'calculated-ephemeris'},...Object.fromEntries(events.map(key=>[key,instant])),moon:ref('NightSkyMoon'),astronomicalNight:ref('AstronomicalNight')}),
    NightSkyModel:object({id:text,version:text,contractVersion:text,url:{type:'string',format:'uri'},attribution:text,timezone:{const:'Atlantic/Cape_Verde'},utcOffset:{const:'-01:00'}}),
    NightSkyPage:object({revision:text,status:{const:'available'},dataKind:{const:'calculated-ephemeris'},year:{type:'integer',minimum:2000,maximum:2100},timezone:{const:'Atlantic/Cape_Verde'},utcOffset:{const:'-01:00'},location:ref('Point'),assumedElevationMetres:{const:0},model:ref('NightSkyModel'),sourceIds:{type:'array',items:text},sourceUpdatedAt:{type:'null'},retrievedAt:{type:'null'},caveats:{type:'array',items:text},numberMatched:{type:'integer',minimum:0},numberReturned:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:500},offset:{type:'integer',minimum:0},records:{type:'array',items:ref('NightSkyDay')},links:ref('PaginationLinks')}),
  });
  spec.components.schemas.SourceContract.properties.links.properties.nightSky = text;
  spec.components.schemas.InteroperabilityCatalog.properties.domains = { type: 'array', items: ref('CalculationDomain') };
  spec.components.schemas.CalculationDomain = object({id:text,title:text,status:{const:'available'},delivery:{const:'on-demand-calculation'},sourceIds:{type:'array',items:text},links:object({self:text,page:text})});
  const parameters=[
    ['year','Calendar year. Defaults to current Cape Verde year, or the supplied date year.',{type:'integer',minimum:2000,maximum:2100}],
    ['date','Optional single local calendar date. Must agree with year if both supplied.',{type:'string',format:'date'}],
    ['latitude','Optional latitude; provide with longitude. At most six decimal places. Defaults to 15.25.',{type:'number',minimum:15.05,maximum:15.4}],
    ['longitude','Optional longitude; provide with latitude. At most six decimal places. Defaults to -23.15.',{type:'number',minimum:-23.3,maximum:-23.02}],
    ['limit','Page size; use 500 for the complete year.',{type:'integer',minimum:1,maximum:500,default:100}],
    ['offset','Zero-based offset in ascending local date order.',{type:'integer',minimum:0,default:0}],
  ].map(([name,description,schema])=>({name,description,schema,in:'query'}));
  const template=structuredClone(spec.paths['/observations'].get);
  template.operationId='getNightSky';template.summary='Year-round calculated Sun/Moon almanac for Maio; not weather or observed visibility';
  template.parameters=[...parameters,{name:'If-None-Match',in:'header',schema:text}];
  template.responses[200].content={'application/json':{schema:ref('NightSkyPage')}};
  template.responses[200].headers['X-Data-Revision'].description='Calculation revision derived from pinned model/contract, year and observer coordinates; independent of source snapshot revision.';
  spec.paths['/night-sky']={get:template};
  return spec;
}
