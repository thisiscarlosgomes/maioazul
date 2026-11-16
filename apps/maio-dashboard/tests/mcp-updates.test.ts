import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBoats, parseFlights } from '../lib/schedules/parsers';
import { executeOpenDataTool, openDataSchemas } from '../lib/mcp/open-data-tools';
import { handleMcpRequest } from '../lib/mcp/server';
import { clearMaioDirectoryCache, executeMaioTool, MAIO_DIRECTORY_CACHE_TTL_MS, MAIO_DIRECTORY_TIMEOUT_MS, nativeToolDefinitions, toolSchemas } from '../lib/chat/maio-data-tools';
import { readFileSync } from 'node:fs';
const boat=(date='18/09/2026', title='18 September - Friday', rows='<tr><td>LS</td><td>17:00</td><td>Santiago</td><td>Maio</td></tr>')=>`<input id="hdfDepartureDate_0" value="${date} 00:00:00" /><a class="aScheduleDayPickActive">18 Sep</a><tr><td class='tdScheduleSubtitle'>${title}</td></tr>${rows}`;
test('boats preserve actual times and only the explicitly dated source day',()=>{
  const data=parseBoats(boat(),'2026-09-18');assert.equal(data.schedules.length,1);assert.equal(data.schedules[0].departure,'17:00');assert.equal(data.schedules[0].scheduledDeparture,'2026-09-18T17:00:00-01:00');assert.equal(data.schedules[0].vessel,null);assert.equal(data.fallback,false);
  assert.equal(parseBoats(boat(),'2026-09-19').status,'stale');assert.equal(parseBoats(boat(),'2026-09-19').schedules.length,0);
  assert.equal(parseBoats(boat('18/09/2026','19 September - Saturday'),'2026-09-18').status,'unavailable');
  assert.equal(parseBoats('<p>LS 07:00 Santiago Maio</p>','2026-09-18').schedules.length,0);
  assert.equal(parseBoats(boat('18/09/2026','18 September - Friday',''),'2026-09-18').status,'no-records');
});
test('flight expiry and validity prevent stale/seasonal or undated rows being presented as current',()=>{
 const row=(dates:string)=>`Fri 15:00 Praia (RAI) 15:20 Maio (MMO) Cabo Verde Airlines VR 4071 ${dates}`;
 assert.equal(parseFlights(row('Effective 2026-01-09 through 2026-03-27'),'RAI','MMO','2026-09-19').records.length,0);
 const good=parseFlights(row('Effective 2026-09-01 through 2026-10-31'),'RAI','MMO','2026-09-19');assert.equal(good.records[0].validTo,'2026-10-31');assert.equal(good.records[0].flight,'VR4071');
 assert.equal(parseFlights(row(''),'RAI','MMO','2026-09-19').records.length,0);
 assert.equal(parseFlights(row('Effective 2026-10-01 through 2026-10-31'),'RAI','MMO','2026-09-19').records.length,0);
 assert.equal(parseFlights(row('Valid until 2026-02-30'),'RAI','MMO','2026-01-01').records.length,0);
});
test('Open API bridge uses fixed origin, bounded filters and preserves original provenance',async()=>{
 let requested='';const payload={records:[{value:null,sourceId:'source',unit:'thousand-CVE'}],links:{next:'next'}};
 const mock=(async(url:URL|RequestInfo)=>{requested=String(url);return Response.json(payload)}) as typeof fetch;
 assert.deepEqual(await executeOpenDataTool('get_open_data_dataset',{datasetId:'business-demography',year:2024},mock),payload);
 assert.equal(requested,'https://api.maio.cv/api/v1/datasets/business-demography/records?year=2024&limit=25&offset=0');
 await executeOpenDataTool('get_open_data_collection',{collectionId:'beaches',q:null,bbox:null,limit:100,offset:0},mock);
 assert.equal(requested,'https://api.maio.cv/api/v1/collections/beaches/items?limit=100&offset=0');
 await executeOpenDataTool('get_open_data_collection',{collectionId:'beaches',q:undefined,bbox:undefined,limit:100,offset:0},mock);
 assert.equal(requested,'https://api.maio.cv/api/v1/collections/beaches/items?limit=100&offset=0');
 assert.throws(()=>openDataSchemas.get_open_data_feature.parse({featureId:'../secret'}));
 assert.deepEqual(openDataSchemas.get_open_data_collection.parse({collectionId:'beaches',q:null,bbox:null,limit:null,offset:null}),{collectionId:'beaches',q:null,bbox:null,limit:null,offset:null});
 assert.throws(()=>openDataSchemas.get_open_data_collection.parse({collectionId:'beaches',limit:501}));
 await assert.rejects(executeOpenDataTool('get_open_data_source',{sourceId:'missing'},(async()=>new Response('',{status:404})) as typeof fetch),/404/);
});
test('MCP registry and guide registry stay aligned, including all five new tools',async()=>{
 const response=await handleMcpRequest(new Request('http://localhost/api/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}})}));
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.result.tools.length,31);
 assert.deepEqual(data.result.tools.map((t:{name:string})=>t.name).sort(),Object.keys(nativeToolDefinitions).sort());
 assert.ok(data.result.tools.some((t:{name:string})=>t.name==='get_maio_accommodation'));
 assert.ok(data.result.tools.some((t:{name:string})=>t.name==='get_maio_experiences'));
});
test('stay and experience tools read the public directory, cache briefly, and fail without listings', async () => {
  assert.equal(MAIO_DIRECTORY_TIMEOUT_MS, 4000);
  assert.ok(MAIO_DIRECTORY_CACHE_TTL_MS > 0 && MAIO_DIRECTORY_CACHE_TTL_MS <= 120_000);
  assert.match(nativeToolDefinitions.get_maio_accommodation.description, /prices and availability are not live/i);
  assert.match(nativeToolDefinitions.get_maio_experiences.description, /confirm with the operator/i);
  assert.equal(toolSchemas.get_maio_accommodation.parse({ name: null, area: '  Morro  ' }).area, 'Morro');
  assert.equal(toolSchemas.get_maio_accommodation.parse({ name: null, area: '  Morro  ' }).name, undefined);
  assert.throws(() => toolSchemas.get_maio_accommodation.parse({ name: 'Villa', area: null, extra: true }));
  assert.throws(() => toolSchemas.get_maio_experiences.parse({ kind: 's'.repeat(81), name: null }));

  const prompt = readFileSync(new URL('../app/api/chat/route.ts', import.meta.url), 'utf8');
  for (const phrase of ['get_maio_accommodation', 'get_maio_experiences', 'where can I stay', 'hotels in Maio', 'onde ficar', 'surf lessons', 'boat trips', 'excursões']) {
    assert.ok(prompt.includes(phrase), phrase);
  }
  assert.match(prompt, /Não invente locais, alojamentos/);

  const accommodation = {
    type: 'FeatureCollection',
    revision: 'rev-stays',
    attribution: 'Source attribution',
    caveats: ['Incomplete accommodation directory, not a verified current inventory. Prices and availability are not live.'],
    links: { next: null },
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-23.21, 15.14] },
        properties: {
          publicationStatus: 'published',
          attributes: {
            name: 'Hotel Big Game Maio',
            location: 'Cidade do Porto Inglês',
            address: 'Fontona',
            tourism: 'hotel',
            phone: '002385977305',
            email: 'biggamemaio@gmail.com',
            website: 'https://biggamemaio.com/hotel',
            source_url: 'https://biggamemaio.com/rates',
            booking_url: 'https://biggamemaio.com/rates',
          },
        },
      },
      {
        type: 'Feature',
        geometry: null,
        properties: {
          publicationStatus: 'published',
          attributes: {
            name: 'Home in Morro',
            location: 'Morro',
            address: '',
            tourism: 'guest_house',
            phone: '',
            email: '',
            website: '',
            source_url: 'https://example.com/morro',
          },
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-23.23, 15.17] },
        properties: {
          name: 'Villa Maris Eco Village',
          publicationStatus: 'published',
          attributes: {
            name: 'Villa Maris Eco Village',
            location: 'Morro',
            address: 'Morro',
            tourism: 'hotel',
            phone: '+238 595 79 68',
            website: 'https://villamariscv.com/',
            source_url: 'https://www.openstreetmap.org/node/5241625614',
            booking_url: 'https://villamariscv.com/book',
          },
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-23.2, 15.2] },
        properties: { publicationStatus: 'withdrawn', attributes: { name: 'Closed Place', location: 'Morro', phone: '123' } },
      },
      { type: 'Feature', properties: { publicationStatus: 'published', attributes: { location: 'Morro' } } },
    ],
  };
  const experiences = {
    type: 'FeatureCollection',
    revision: 'rev-exp',
    caveats: ['Staff-maintained experience directory. Prices and schedules are indicative, not live availability. Confirm details with the operator.'],
    links: { next: null },
    features: [
      {
        type: 'Feature',
        geometry: null,
        properties: {
          publicationStatus: 'published',
          attributes: {
            name: 'Onda Azul Maio',
            category: 'water_sports',
            experience: 'activity',
            operator: 'Onda Azul Maio — Hemerson and Julia',
            phone: '+238 597 11 98',
            email: 'ondaazul.maio@gmail.com',
            website: 'https://ondaazulmaio.example',
            price: 35,
            currency: 'EUR',
            priceBasis: 'person',
          },
        },
      },
      {
        type: 'Feature',
        geometry: null,
        properties: {
          publicationStatus: 'published',
          attributes: {
            name: 'Jet Ski',
            category: 'other',
            experience: 'activity',
            operator: '',
            phone: '',
            booking_url: 'https://www.instagram.com/jetski_maio.cv/',
            price: null,
            currency: 'CVE',
          },
        },
      },
      {
        type: 'Feature',
        properties: { publicationStatus: 'withdrawn', attributes: { name: 'Old Tour', category: 'guided_tour', price: 10 } },
      },
    ],
  };

  const original = globalThis.fetch;
  const calls: string[] = [];
  let mode: 'ok' | 'down' | 'bad' | 'timeout' = 'ok';
  globalThis.fetch = (async (url: URL | RequestInfo, init?: RequestInit) => {
    calls.push(String(url));
    assert.equal(init?.cache, 'no-store');
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal instanceof AbortSignal);
    if (mode === 'down') return new Response('nope', { status: 503 });
    if (mode === 'bad') return Response.json({ hello: true });
    if (mode === 'timeout') {
      const error = new Error('timed out');
      error.name = 'TimeoutError';
      throw error;
    }
    return Response.json(String(url).includes('/experiences') ? experiences : accommodation);
  }) as typeof fetch;

  const request = new Request('http://localhost/api/chat');
  const record = (value: unknown) => {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value));
    return value as Record<string, unknown>;
  };

  try {
    clearMaioDirectoryCache();
    const listed = record(await executeMaioTool(request, 'get_maio_accommodation', { name: null, area: null }));
    assert.equal(listed.available, true);
    assert.equal(listed.source, 'https://api.maio.cv/api/v1/accommodation?limit=100');
    assert.match(String(listed.caveat), /Prices and availability are not live/);
    const stays = listed.stays as Array<Record<string, unknown>>;
    assert.deepEqual(stays.map((stay) => stay.name), ['Hotel Big Game Maio', 'Home in Morro', 'Villa Maris Eco Village']);
    assert.deepEqual(stays[0].coordinates, { longitude: -23.21, latitude: 15.14 });
    assert.deepEqual(stays[0].contact, { phone: '002385977305', email: 'biggamemaio@gmail.com' });
    assert.equal(stays[0].website, 'https://biggamemaio.com/hotel');
    assert.equal(stays[0].source_url, 'https://biggamemaio.com/rates');
    assert.equal(stays[0].booking_url, null);
    assert.equal(stays[0].area, 'Cidade do Porto Inglês');
    assert.equal(stays[0].locality, 'Fontona');
    assert.equal(stays[1].coordinates, null);
    assert.deepEqual(stays[1].contact, { phone: null, email: null });
    assert.equal(stays[1].source_url, 'https://example.com/morro');
    assert.equal(stays[2].booking_url, 'https://villamariscv.com/book');
    assert.equal(calls.length, 1);
    await executeMaioTool(request, 'get_maio_accommodation', { name: null, area: null });
    assert.equal(calls.length, 1);

    clearMaioDirectoryCache();
    calls.length = 0;
    const byArea = record(await executeMaioTool(request, 'get_maio_accommodation', { name: null, area: 'Morro' }));
    assert.equal(byArea.source, 'https://api.maio.cv/api/v1/accommodation?q=Morro&limit=100');
    const byNameAndArea = record(await executeMaioTool(request, 'get_maio_accommodation', { name: 'Villa', area: 'Morro' }));
    assert.equal(byNameAndArea.source, 'https://api.maio.cv/api/v1/accommodation?q=Morro&limit=100');
    assert.deepEqual((byNameAndArea.stays as Array<Record<string, unknown>>).map((stay) => stay.name), ['Villa Maris Eco Village']);
    assert.equal(calls.length, 1);

    clearMaioDirectoryCache();
    const surf = record(await executeMaioTool(request, 'get_maio_experiences', { kind: 'surf', name: null }));
    assert.equal(surf.source, 'https://api.maio.cv/api/v1/experiences?q=surf&limit=100');
    assert.match(String(surf.caveat), /Confirm details with the operator/);
    const rows = surf.experiences as Array<Record<string, unknown>>;
    assert.equal(rows.length, 2);
    assert.equal(rows[0].kind, 'water_sports');
    assert.equal(rows[0].operator, 'Onda Azul Maio — Hemerson and Julia');
    assert.deepEqual(rows[0].indicative_price, { amount: 35, currency: 'EUR', basis: 'person' });
    assert.equal(rows[1].kind, null);
    assert.equal(rows[1].indicative_price, null);
    assert.deepEqual(rows[1].contact, { phone: null, email: null, website: null, booking_url: 'https://www.instagram.com/jetski_maio.cv/' });
    const named = record(await executeMaioTool(request, 'get_maio_experiences', { kind: 'surf', name: 'Onda' }));
    assert.deepEqual((named.experiences as Array<Record<string, unknown>>).map((row) => row.name), ['Onda Azul Maio']);
    const missing = record(await executeMaioTool(request, 'get_maio_experiences', { kind: 'surf', name: 'Missing' }));
    assert.equal(missing.available, true);
    assert.deepEqual(missing.experiences, []);
    assert.match(String(missing.caveat), /Confirm details with the operator/);

    clearMaioDirectoryCache();
    mode = 'down';
    const down = record(await executeMaioTool(request, 'get_maio_accommodation', {}));
    assert.equal(down.available, false);
    assert.deepEqual(down.stays, []);
    assert.match(String(down.error), /HTTP 503/);
    assert.match(String(down.error), /Do not invent stays/);
    assert.match(String(down.caveat), /Prices and availability are not live/);
    mode = 'ok';
    const recovered = record(await executeMaioTool(request, 'get_maio_accommodation', {}));
    assert.equal(recovered.available, true);

    clearMaioDirectoryCache();
    mode = 'timeout';
    const timedOut = record(await executeMaioTool(request, 'get_maio_experiences', { kind: null, name: null }));
    assert.equal(timedOut.available, false);
    assert.deepEqual(timedOut.experiences, []);
    assert.match(String(timedOut.error), /timed out/);
    assert.match(String(timedOut.error), /Do not invent experiences/);

    clearMaioDirectoryCache();
    mode = 'bad';
    const bad = record(await executeMaioTool(request, 'get_maio_experiences', { kind: 'quad', name: null }));
    assert.equal(bad.available, false);
    assert.deepEqual(bad.experiences, []);
    assert.match(String(bad.caveat), /Confirm details with the operator/);
  } finally {
    globalThis.fetch = original;
    clearMaioDirectoryCache();
  }
});
