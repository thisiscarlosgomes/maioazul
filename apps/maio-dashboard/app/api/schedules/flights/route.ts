import { NextResponse } from 'next/server';
import { capeVerdeDate, parseFlights } from '@/lib/schedules/parsers';
export const dynamic = 'force-dynamic';
const sources={rai_mmo:'https://info.flightmapper.net/route/Cabo_Verde_Airlines_VR_RAI_MMO',mmo_rai:'https://info.flightmapper.net/route/Cabo_Verde_Airlines_VR_MMO_RAI'};
export async function GET() {
  const today=capeVerdeDate();
  const results=await Promise.all(Object.entries(sources).map(async([key,url])=>{
    try{
      const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!res.ok) throw new Error('upstream');
      const html=await res.text(),retrievedAt=new Date().toISOString();
      const parsed=parseFlights(html,key==='rai_mmo'?'RAI':'MMO',key==='rai_mmo'?'MMO':'RAI',today);
      return {key,...parsed,retrievedAt,status:parsed.records.length?'available':'no-current-records'};
    }catch{return {key,records:[],excluded:0,retrievedAt:null,status:'unavailable'};}
  }));
  const unavailable=results.every(r=>r.status==='unavailable');
  return NextResponse.json({source:'FlightMapper',sourceUrls:sources,status:unavailable?'unavailable':results.some(r=>r.status==='unavailable')?'partial':results.some(r=>r.records.length)?'available':'no-current-records',updated_at:null,sourceUpdatedAt:null,retrievedAt:results.map(r=>r.retrievedAt).filter(Boolean).sort().at(-1)??null,referenceDate:today,timeZone:'Atlantic/Cape_Verde',routes:Object.fromEntries(results.map(r=>[r.key,r.records])),routeStatus:Object.fromEntries(results.map(r=>[r.key,{status:r.status,retrievedAt:r.retrievedAt,excludedRows:r.excluded}])),caveats:['Third-party published timetable, not live operations or airline confirmation.','Only explicit weekday rows whose published validity includes today are returned. Expired, future-only and undated rows are excluded. No current records does not mean no flights.','Unverified local cache files are not used. updated_at is null: publication time is unknown.']},{status:unavailable?503:200,headers:{'Cache-Control':'no-store'}});
}
