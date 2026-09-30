const ref=name=>({$ref:`#/components/schemas/${name}`});
const object=properties=>({type:'object',required:Object.keys(properties),properties});
export function constellationOpenapi(spec) {
  const text={type:'string'},strings={type:'array',items:text},altitude={type:'number',minimum:-90,maximum:90},bool={type:'boolean'};
  Object.assign(spec.components.schemas,{
    ConstellationReferencePoint:object({name:text,rightAscensionHours:{type:'number',minimum:0,exclusiveMaximum:24},declinationDegrees:altitude,coordinateFrame:{const:'J2000 equatorial'},altitudeDegrees:altitude,azimuthDegrees:{type:['number','null'],minimum:0,exclusiveMaximum:360,description:'Degrees clockwise from north; null at zenith/nadir.'},compassDirection:{type:['string','null'],enum:['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW',null]},aboveHorizon:bool}),
    ConstellationPattern:object({starCount:{type:'integer',minimum:1},starsAboveHorizon:{type:'integer',minimum:0},minimumAltitudeDegrees:altitude,maximumAltitudeDegrees:altitude,horizonStatus:{enum:['below-horizon','some-pattern-stars-above','all-pattern-stars-above']}}),
    ConstellationPosition:object({id:ref('ResourceId'),abbreviation:text,name:text,sourceIds:strings,sourceRecordIds:strings,referencePoints:{type:'array',items:ref('ConstellationReferencePoint'),minItems:1},pattern:ref('ConstellationPattern'),aboveHorizon:{type:'boolean',description:'At least one sourced figure-star vertex is above the geometric horizon. Not a full IAU-boundary or naked-eye visibility assertion.'}}),
    ConstellationPage:object({revision:text,status:{const:'available'},dataKind:{const:'calculated-ephemeris'},at:{type:'string',format:'date-time'},localDate:{type:'string',format:'date'},timezone:{const:'Atlantic/Cape_Verde'},utcOffset:{const:'-01:00'},location:ref('Point'),assumedElevationMetres:{const:0},sunAltitudeDegrees:altitude,isAstronomicalDarkness:bool,positionBasis:{const:'sourced-chart-reference-points'},horizonBasis:{const:'sourced-pattern-star-vertices'},model:ref('NightSkyModel'),sourceIds:strings,sourceUpdatedAt:{type:'null'},retrievedAt:{type:'string',format:'date-time',description:'Catalogue retrieval time, not observation or calculation time.'},catalogCommit:text,caveats:strings,numberMatched:{type:'integer',minimum:0},numberReturned:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:500},offset:{type:'integer',minimum:0},records:{type:'array',items:ref('ConstellationPosition')},links:ref('PaginationLinks')}),
  });
  const operation=structuredClone(spec.paths['/night-sky'].get);
  operation.operationId='getConstellations';operation.summary='Constellation pattern horizon status and reference-point direction for a specified instant';
  operation.parameters=operation.parameters.filter(p=>['latitude','longitude','limit','offset','If-None-Match'].includes(p.name));
  operation.parameters.find(p=>p.name==='offset').description='Zero-based offset in stable lowercase constellation ID order.';
  operation.parameters.find(p=>p.name==='limit').description='Page size, 1–500; default 100 (all 88 fit).';
  operation.parameters.push({name:'at',in:'query',required:true,description:'RFC 3339 instant with timezone and seconds, optional 1–3 fractional digits. Local date must be within 2000–2100. Encode + as %2B in query strings.',schema:{type:'string',format:'date-time'}},
    {name:'aboveHorizon',in:'query',description:'true selects constellations with at least one sourced pattern star above the horizon; false selects none above. Omit to return all.',schema:{type:'boolean'}},
    {name:'constellationId',in:'query',description:'Exact lowercase abbreviation (ori, cru, ser). Unknown valid IDs return an empty list.',schema:{type:'string',pattern:'^[a-z]{3}$'}});
  operation.responses[200].content={'application/json':{schema:ref('ConstellationPage')}};
  operation.responses[200].headers['X-Data-Revision'].description='Pinned catalogue checksum, model/contract version, normalized instant and observer coordinates.';
  spec.paths['/night-sky/constellations']={get:operation};
  return spec;
}
