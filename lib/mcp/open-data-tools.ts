import * as z from 'zod/v4';
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(160);
const paging = { limit: z.number().int().min(1).max(100).default(25), offset: z.number().int().min(0).default(0) };
export const openDataSchemas = {
  get_open_data_catalog: z.object({}).strict(),
  get_open_data_collection: z.object({ collectionId: id, q: z.string().max(200).optional(), bbox: z.string().max(120).optional(), ...paging }).strict(),
  get_open_data_feature: z.object({ featureId: id }).strict(),
  get_open_data_dataset: z.object({ datasetId: id, view: z.enum(['metadata','records']).default('records'), year: z.number().int().min(1).max(9999).optional(), indicator: z.string().max(200).optional(), geographicScope: z.string().max(200).optional(), ...paging }).strict(),
  get_open_data_source: z.object({ sourceId: id }).strict(),
};
const descriptions = {
  get_open_data_catalog: 'Discover Maio Open API collections, datasets and sources. Inspect availability and provenance; planned does not mean zero.',
  get_open_data_collection: 'Read a paginated GeoJSON collection from api.maio.cv, including businesses, business-statistics, transport, beaches and public infrastructure. Null geometry is allowed. Preserve source attribution and follow pagination.',
  get_open_data_feature: 'Read one public feature by stable ID. Check publicationStatus: withdrawn records are retained for compatibility and must not be presented as current listings.',
  get_open_data_dataset: 'Read normalized dataset records or metadata from api.maio.cv. business-demography contains Maio IAE 2024 estimates; preserve units, nulls, source cells and caveats. Metadata view omits large payloads; legacy datasets may have no normalized records.',
  get_open_data_source: 'Read source provenance, licensing, timestamps and refresh limitations from api.maio.cv. A recent retrieval is not a recent source publication.',
};
function strictParameters(schema: z.ZodType) {
  const json = z.toJSONSchema(schema) as { properties?: Record<string, Record<string, unknown>>; required?: string[]; [key: string]: unknown };
  delete json.$schema;
  for (const [key, property] of Object.entries(json.properties ?? {})) {
    delete property.default;
    if (!json.required?.includes(key)) json.properties![key] = { anyOf: [property, { type: 'null' }] };
  }
  json.required = Object.keys(json.properties ?? {});
  return json;
}
export const openDataDefinitions = Object.fromEntries(Object.entries(openDataSchemas).map(([name, schema]) => [name, {
  title: name.replaceAll('_',' '), description: descriptions[name as keyof typeof descriptions], parameters: strictParameters(schema),
}])) as unknown as Record<keyof typeof openDataSchemas, {title:string;description:string;parameters:Record<string,unknown>}>;

export async function executeOpenDataTool(name: keyof typeof openDataSchemas, raw: unknown, fetcher: typeof fetch = fetch) {
  const args = openDataSchemas[name].parse(raw ?? {}) as Record<string, string|number>;
  let path = '/catalog';
  if (name === 'get_open_data_collection') path = `/collections/${args.collectionId}/items`;
  if (name === 'get_open_data_feature') path = `/features/${args.featureId}`;
  if (name === 'get_open_data_dataset') path = `/datasets/${args.datasetId}${args.view === 'records' ? '/records' : ''}`;
  if (name === 'get_open_data_source') path = `/sources/${args.sourceId}`;
  const url = new URL('/api/v1'+path,'https://api.maio.cv');
  if (name === 'get_open_data_collection' || (name === 'get_open_data_dataset' && args.view === 'records')) {
    for(const [key,value] of Object.entries(args)) if(!['collectionId','datasetId','view'].includes(key)) url.searchParams.set(key,String(value));
  }
  const response = await fetcher(url, { headers: {Accept:'application/json'}, cache:'no-store', signal:AbortSignal.timeout(15000), redirect:'error' });
  if(!response.ok) throw new Error(`Maio Open API returned HTTP ${response.status}`);
  const data = await response.json();
  if (name === 'get_open_data_catalog') return { ...data, sources: data.sources.map((s: {id:string;title:string;classification:string;provenanceStatus:string;links:unknown})=>({id:s.id,title:s.title,classification:s.classification,provenanceStatus:s.provenanceStatus,links:s.links})) };
  if (name === 'get_open_data_dataset' && args.view === 'metadata') { const {payload,records,...metadata}=data; return {...metadata, payloadAvailable:payload!==null, normalizedRecordCount:records?.length??0}; }
  return data;
}
