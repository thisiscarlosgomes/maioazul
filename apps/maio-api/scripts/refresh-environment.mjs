import { writeFile, rename } from 'node:fs/promises';
import { providers, normalizeEnvironment } from '../lib/environment.mjs';
// Same representative request location used by the existing Maio application.
// Provider-returned grid coordinates are retained separately on observations.
const entries=await Promise.all(providers.map(async provider=>{
  const url=new URL(provider.endpoint);
  url.search=new URLSearchParams({latitude:'15.25',longitude:'-23.15',current:Object.keys(provider.variables).join(','),timezone:'GMT',timeformat:'unixtime',forecast_days:'1'}).toString();
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw Error(`${provider.id}: HTTP ${response.status}; previous snapshot preserved`);
  return {sourceId:provider.id,url:String(url),retrievedAt:new Date().toISOString(),payload:await response.json()};
}));
const bundle={entries};
const observations=normalizeEnvironment(bundle);
const target=new URL('../data/environment-source.json',import.meta.url);
const temp=new URL('../data/environment-source.json.tmp',import.meta.url);
await writeFile(temp,JSON.stringify(bundle,null,2)+'\n');
await rename(temp,target);
console.log(`Saved ${observations.length} sourced model estimates. Run data:sync to include them. No deployment performed.`);
