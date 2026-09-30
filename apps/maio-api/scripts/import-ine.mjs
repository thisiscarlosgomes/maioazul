import {readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {normalizeINE} from '../lib/ine/importer.mjs';
const args=process.argv.slice(2);
if(!args.length||args.some((arg,i)=>i>0&&arg!=='--apply')) throw Error('Usage: node scripts/import-ine.mjs /path/to/reviewed-package.json [--apply]. Default: validation only.');
const input=JSON.parse(await readFile(path.resolve(args[0]),'utf8'));
const registry=JSON.parse(await readFile(new URL('../data/place-registry.json',import.meta.url),'utf8'));
const imported=normalizeINE(input,registry);
const folder=fileURLToPath(new URL('../data/ine/',import.meta.url));
const indexPath=path.join(folder,'imports.json');
const index=JSON.parse(await readFile(indexPath,'utf8'));
const file=`${imported.source.id}.json`;
if(args.includes('--apply')) {
  // One immutable edition per source ID. Corrections must carry a new edition ID,
  // or an explicit reviewed replacement outside this command.
  if(index.includes(file)) throw Error('Source edition already registered; refusing to overwrite');
  const target=path.join(folder,file);
  await writeFile(target,JSON.stringify(input,null,2)+'\n',{flag:'wx'});
  const temp=`${indexPath}.tmp`;
  await writeFile(temp,JSON.stringify([...index,file].sort(),null,2)+'\n');
  await rename(temp,indexPath);
}
console.log(JSON.stringify({mode:args.includes('--apply')?'registered locally; run data:sync':'validation only',sourceId:imported.source.id,statisticalRecords:imported.records.length,geographicFeatures:imported.features.length,placeLinks:imported.placeLinks.length,deployed:false},null,2));
