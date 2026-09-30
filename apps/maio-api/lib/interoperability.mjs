// A materialized snapshot is a delivery cache, never a replacement for its sources.
function publicUrls(value, found = new Set()) {
  if (typeof value === 'string' && /^https?:\/\//.test(value)) {
    try { const u = new URL(value); if (!u.username && !u.password) found.add(u.href); } catch {}
  } else if (Array.isArray(value)) value.forEach(v => publicUrls(v, found));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => publicUrls(v, found));
  return [...found].sort();
}
export function sourceContract(source, datasets) {
  const linked = datasets.filter(d => d.sourceIds?.includes(source.id));
  const skyCatalog = source.id === 'd3-celestial-constellations';
  const astronomy = source.id === 'astronomy-engine';
  const model = source.id.startsWith('open-meteo-');
  const osm = source.license?.startsWith('ODbL');
  const workbook = source.id === 'iae-2024-user-workbook';
  const port = source.id === 'enapor-porto-ingles';
  const official = source.id.startsWith('ine-');
  const ingt = source.id === 'ingt-carta-agricola-maio';
  const population = source.id === 'dashboard-population';
  const budget = source.id.startsWith('cv-maio-bo-');
  const upstreamUrls = [...new Set([source.url, ...linked.flatMap(d => publicUrls(d.source))].filter(Boolean))];
  return {
    ...source,
    upstreamUrls,
    classification: port || ingt ? 'reviewed-official-publication' : skyCatalog ? 'reference-catalog' : astronomy ? 'calculation-model' : model ? 'model-provider' : osm ? 'community-map' : official ? 'reviewed-official-publication' : workbook || population || budget || source.id.startsWith('dataset-') ? 'secondary-extract' : 'editorial',
    provenanceStatus: port || ingt ? 'reviewed' : official ? 'reviewed' : workbook || population || budget ? 'needs-review' : upstreamUrls.length ? 'linked-source' : 'publication-link-missing',
    delivery: astronomy ? 'on-demand-calculation' : 'materialized-snapshot',
    refresh: {
      automatic: false,
      method: astronomy ? 'versioned-calculation' : model ? 'provider-api' : population ? 'dashboard-database-export' : ingt ? 'arcgis-rest-import' : official ? 'reviewed-file-import' : 'repository-file-import',
      command: workbook ? 'python scripts/import-business-statistics.py <reviewed-2024-workbook.xls> && npm run data:sync' : skyCatalog ? 'node apps/maio-api/scripts/import-constellations.mjs <reviewed-commit>' : model ? 'npm --workspace apps/maio-api run data:refresh-environment' : population ? 'node apps/maio-api/scripts/export-dashboard-population.mjs' : ingt ? 'npm --workspace apps/maio-api run data:import-agriculture -- --output data/ingt-agriculture-maio.json' : official ? 'npm --workspace apps/maio-api run data:import-ine -- <reviewed-package> --apply' : 'npm --workspace apps/maio-api run data:sync',
      retrievedAt: source.retrievedAt ?? null,
      sourceUpdatedAt: source.sourceUpdatedAt ?? null,
      freshnessAssessment: 'not-assessed',
      note: astronomy ? 'Calculated on demand using a pinned model; no upstream observation retrieval or live freshness timestamp. Model upgrades require a reviewed dependency update and deployment.' : 'No refresh SLA or automatic polling. Request time and cache validation do not establish source freshness.',
    },
    transformation: {
      implementation: workbook ? 'scripts/import-business-statistics.py; scripts/sync-data.mjs' : skyCatalog ? 'scripts/import-constellations.mjs; lib/constellations.mjs' : astronomy ? 'lib/night-sky.mjs' : ingt ? 'scripts/import-ingt-agriculture.py; scripts/sync-data.mjs' : official ? 'lib/ine/importer.mjs' : model ? 'lib/environment.mjs' : 'scripts/sync-data.mjs',
      description: port ? 'Port identity and location name manually reviewed against ENAPOR port page. ENAPOR supplies no coordinates; feature geometry is separately attributed to the project owner. No schedules or live status inferred.' : workbook ? 'Allowlisted Maio IAE 2024 cells only. Raw survey precision, thousand-CVE units, source sheets/cells/formats and missing markers retained. Exact publication URL and reuse license unverified; no inferred geometry or individual companies.' : skyCatalog ? 'Pinned source J2000 label and pattern-star coordinates; Serpens parts grouped under one stable ID. Precession/nutation/horizon rotation with Astronomy Engine; no observed-visibility claim.' : astronomy ? 'Deterministic Sun/Moon ephemerides using the pinned Astronomy Engine model, explicit location, sea-level horizon and local date. No weather or sensor inference.' : model ? 'Provider current-condition values, units, valid times and grid coordinates; explicitly model estimates.' : population ? 'Allowlisted Maio island population export; unverified original INE publication; no locality allocation.' : budget ? 'Allowlisted numeric budget summaries from first-pass extractions; not expenditure execution.' : official ? 'Reviewed typed aggregate/geographic import with explicit code crosswalks; no inferred values.' : 'Explicit source-file import; stable source IDs, original attributes and memberships retained. Unnamed beach records excluded by editorial publication policy.',
      ...(ingt ? { description: 'ArcGIS REST layer 5 GeoJSON with original attributes retained. Z/M values are removed for RFC 7946 output; WGS84 geodesic hectares are marked as calculated and unioned within each classification.' } : {}),
    },
  };
}
export function describeSource(snapshot, source) {
  const collections = snapshot.collections.filter(c => snapshot.features.some(f => f.properties.collections.includes(c.id) && f.properties.sourceIds.includes(source.id)));
  const datasets = snapshot.datasets.filter(d => d.sourceIds?.includes(source.id));
  return { ...source, links: {
    ...(["astronomy-engine", "d3-celestial-constellations"].includes(source.id) ? { astronomy: "/api/v1/astronomy", nightSky: "/api/v1/night-sky" } : {}),
    ...(source.id === "ingt-carta-agricola-maio" ? { agriculture: "/api/v1/agriculture" } : {}),
    self: `/api/v1/sources/${encodeURIComponent(source.id)}`,
    features: `/api/v1/features?sourceId=${encodeURIComponent(source.id)}`,
    collections: collections.map(c => `/api/v1/collections/${c.id}`),
    datasets: datasets.map(d => `/api/v1/datasets/${d.id}`),
  } };
}
export function interoperabilityCatalog(snapshot) {
  return {
    revision: snapshot.revision,
    role: 'public-data-interoperability-layer',
    delivery: 'materialized-snapshot',
    principle: 'Authoritative source → Maio interoperability layer → applications. Source identity, limitations and reuse rights travel with the data.',
    limitations: ['Not all connected data is authoritative. Inspect each source classification and provenanceStatus.', 'Refreshes are manual; some source publication links and dates remain unknown.', 'This discovery catalog is not a claim of DCAT-AP or OGC conformance.'],
    domains: [{ id: 'agriculture', title: 'Maio Agriculture', status: 'available', delivery: 'materialized-snapshot', sourceIds: ['ingt-carta-agricola-maio'], links: { self: '/api/v1/agriculture', landUse: '/api/v1/agriculture/land-use', areas: '/api/v1/agriculture/areas' } }, { id: 'astronomy', title: 'Maio Astronomy', status: 'available', delivery: 'on-demand-calculation', sourceIds: ['astronomy-engine', 'd3-celestial-constellations'], links: { self: '/api/v1/astronomy', page: '/night-sky' } }, { aliasOf: 'astronomy', id: 'night-sky', title: 'Maio Night Sky', status: 'available', delivery: 'on-demand-calculation', sourceIds: ['astronomy-engine', 'd3-celestial-constellations'], links: { self: '/api/v1/night-sky', page: '/night-sky', constellations: '/api/v1/night-sky/constellations' } }],
    collections: snapshot.collections.map(c => ({id:c.id,title:c.title,status:c.status,links:{self:`/api/v1/collections/${c.id}`,items:`/api/v1/collections/${c.id}/items`},sourceIds:[...new Set(snapshot.features.filter(f=>f.properties.collections.includes(c.id)).flatMap(f=>f.properties.sourceIds))].sort()})),
    datasets: snapshot.datasets.map(d => ({id:d.id,title:d.title,status:d.status,recordsStatus:d.recordsStatus,sourceIds:d.sourceIds,license:d.license,caveats:d.caveats,links:{self:`/api/v1/datasets/${d.id}`,records:`/api/v1/datasets/${d.id}/records`}})),
    sources: snapshot.sources.map(s => describeSource(snapshot,s)),
    links:{agriculture:'/api/v1/agriculture',astronomy:'/api/v1/astronomy',nightSky:'/api/v1/night-sky',self:'/api/v1/catalog',sources:'/api/v1/sources',places:'/api/v1/places',openapi:'/api/v1/openapi.json'},
  };
}
