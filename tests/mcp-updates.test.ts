import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBoats, parseFlights } from '../lib/schedules/parsers';
import { executeOpenDataTool, openDataSchemas } from '../lib/mcp/open-data-tools';
import { handleMcpRequest } from '../lib/mcp/server';
import { nativeToolDefinitions } from '../lib/chat/maio-data-tools';
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
 assert.throws(()=>openDataSchemas.get_open_data_feature.parse({featureId:'../secret'}));
 assert.throws(()=>openDataSchemas.get_open_data_collection.parse({collectionId:'beaches',limit:501}));
 await assert.rejects(executeOpenDataTool('get_open_data_source',{sourceId:'missing'},(async()=>new Response('',{status:404})) as typeof fetch),/404/);
});
test('MCP registry and guide registry stay aligned, including all five new tools',async()=>{
 const response=await handleMcpRequest(new Request('http://localhost/api/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{}})}));
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.result.tools.length,29);
 assert.deepEqual(data.result.tools.map((t:{name:string})=>t.name).sort(),Object.keys(nativeToolDefinitions).sort());
});
