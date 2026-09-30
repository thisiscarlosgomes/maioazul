export const stripHtml = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
export const capeVerdeDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'Atlantic/Cape_Verde',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
export function parseBoats(html: string, today: string) {
  // Pair each date picker with its own full source date; never infer the year.
  const pairs = [...html.matchAll(/<input\b[^>]*hdfDepartureDate[^>]*value="(\d{2})\/(\d{2})\/(\d{4})[^" ]*[^>]*>\s*<a\b([^>]*)>/g)];
  const active = pairs.find(m => /class="aScheduleDayPickActive"/.test(m[4]));
  const selected = active ? `${active[3]}-${active[2]}-${active[1]}` : null;
  const subtitle = html.match(/<td[^>]*class=['"]tdScheduleSubtitle['"][^>]*>([^<]*)<\/td>/i);
  const expectedTitle = selected && validDate(selected) ? new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'numeric',month:'long'}).format(new Date(selected)) : null;
  const dateMatches = !!(selected && expectedTitle && subtitle?.[1].trim().startsWith(expectedTitle+' -'));
  const schedules: {line:string;date:string;vessel:null;operator:string;from:string;to:string;departure:string;arrival:null;scheduledDeparture:string}[]=[];
  if(dateMatches && selected! >= today) {
    // Read only actual table rows, not the route-duration matrix or date picker.
    for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const text=stripHtml(row[1]);
      const m=text.match(/^(LS)\s+([0-2]\d:[0-5]\d)\s+(Santiago|Maio)\s+(Santiago|Maio)$/);
      if(m && Number(m[2].slice(0,2))<24 && m[3]!==m[4]) schedules.push({line:m[1],date:selected!,vessel:null,operator:'CV Interilhas',from:m[3],to:m[4],departure:m[2],arrival:null,scheduledDeparture:`${selected}T${m[2]}:00-01:00`});
    }
  }
  return { status: !dateMatches ? 'unavailable' : selected! < today ? 'stale' : schedules.length ? 'available' : 'no-records', selected_date:selected, available_dates:dateMatches ? [selected] : [], schedules, fallback:false };
}
export function parseFlights(html: string, from: string, to: string, today: string) {
  const text=stripHtml(html);
  // Only the compact dated timetable is supported; never synthesize weekdays.
  const starts=[...text.matchAll(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([0-2]\d:[0-5]\d)\s+[^()]*\((RAI|MMO)\)\s+([0-2]\d:[0-5]\d)\s+[^()]*\((RAI|MMO)\)/g)];
  const records=[];let excluded=0;
  for(let i=0;i<starts.length;i++) {
    const m=starts[i];if(m[3]!==from || m[5]!==to)continue;
    const block=text.slice(m.index!+m[0].length,starts[i+1]?.index ?? text.length).split('A domestic route')[0];
    const range=block.match(/Effective (\d{4}-\d{2}-\d{2}) through (\d{4}-\d{2}-\d{2})/);
    const until=block.match(/Valid until (\d{4}-\d{2}-\d{2})/);
    const validFrom=range?.[1] ?? null, validTo=range?.[2] ?? until?.[1] ?? null;
    if(!validTo || !validDate(validTo) || (validFrom && (!validDate(validFrom)||validFrom>today)) || validTo<today || Number(m[2].slice(0,2))>23 || Number(m[4].slice(0,2))>23) {excluded++;continue;}
    records.push({day:m[1],from,to,departure:m[2],arrival:m[4],airline:'Cabo Verde Airlines',source:'FlightMapper',flight:block.match(/\bVR\s*(\d+)\b/)?.[1] ? `VR${block.match(/\bVR\s*(\d+)\b/)![1]}` : null,validFrom,validTo,status:'scheduled',actualDeparture:null,actualArrival:null});
  }
  return {records,excluded};
}
