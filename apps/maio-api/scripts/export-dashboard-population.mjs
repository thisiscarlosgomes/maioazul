import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {writeFile,rename} from 'node:fs/promises';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const require=createRequire(path.join(root,'package.json'));
require('@next/env').loadEnvConfig(root,false,{info(){},error(){}});
const {MongoClient}=require('mongodb');
if(!process.env.MONGODB_URI)throw Error('Dashboard database configuration unavailable');
const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:8000});
try {
 await client.connect();
 const rows=await client.db().collection('population').find({ilha:/^maio$/i}).project({_id:0,ilha:1,year:1,population:1,updatedAt:1}).sort({year:1}).toArray();
 const seen=new Set();
 const records=rows.map(row=>{
  if(!Number.isInteger(row.year)||!Number.isSafeInteger(row.population)||row.population<0||seen.has(row.year))throw Error('Invalid or duplicate Maio population row; previous export preserved');
  seen.add(row.year);
  return {sourceRecordId:`population/Maio/${row.year}`,ilha:row.ilha,year:row.year,population:row.population,databaseUpdatedAt:row.updatedAt?new Date(row.updatedAt).toISOString():null};
 });
 if(!records.length)throw Error('No Maio population data found; previous export preserved');
 const file=new URL('../data/dashboard-population.json',import.meta.url),temp=new URL('../data/dashboard-population.json.tmp',import.meta.url);
 await writeFile(temp,JSON.stringify({retrievedAt:new Date().toISOString(),records},null,2)+'\n');await rename(temp,file);
 console.log(`Exported ${records.length} existing Maio population record(s); no database writes or deployment.`);
} catch(error) {
 console.error('Population export failed; check connectivity or source validity. Credentials withheld.');process.exitCode=1;
} finally {await client.close();}
