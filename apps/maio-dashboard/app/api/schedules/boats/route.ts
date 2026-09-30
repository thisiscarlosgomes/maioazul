import { NextResponse } from 'next/server';
import { capeVerdeDate, parseBoats } from '@/lib/schedules/parsers';
export const dynamic = 'force-dynamic';
const source='https://www.cvinterilhas.cv/routesschedules';
export async function GET() {
  try {
    const res=await fetch(source,{cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!res.ok) throw new Error('upstream');
    const html=await res.text(), retrievedAt=new Date().toISOString();
    return NextResponse.json({...parseBoats(html,capeVerdeDate()),source,retrievedAt,updated_at:null,sourceUpdatedAt:null,timeZone:'Atlantic/Cape_Verde',coverage:'selected-source-day-only',caveats:['Only the explicitly selected source day is parsed. Date-picker options are not confirmed sailing dates.','No fallback, extrapolated sailings, vessel names, arrivals or live status. Confirm travel with the operator.','updated_at is null because operator publication time is unknown; retrievedAt is fetch time.']},{headers:{'Cache-Control':'no-store'}});
  }catch{
    return NextResponse.json({error:'Boat schedules unavailable',status:'unavailable',source,updated_at:null,retrievedAt:null,selected_date:null,available_dates:[],schedules:[],fallback:false},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
