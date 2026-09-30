import ConstellationsPanel from "./constellations-panel";
import Link from "next/link";
import { queryNightSky } from "@/lib/night-sky.mjs";
const timeFormatter = new Intl.DateTimeFormat("en-GB",{timeZone:"Atlantic/Cape_Verde",hour:"2-digit",minute:"2-digit"});
export const dynamic = "force-dynamic";
export const metadata = { title: "Maio Night Sky · Maio Open API", description: "Year-round Sun and Moon almanac for Maio, Cabo Verde." };
export default async function NightSky({searchParams}:{searchParams:Promise<{year?:string;skyDate?:string;skyTime?:string;latitude?:string;longitude?:string}>}) {
  const search = await searchParams;
  const params = new URLSearchParams({limit:"500"});
  if (search.year !== undefined) params.set("year",String(search.year));
  let data;
  try { data = queryNightSky(params, (message:string)=>new Error(message)); }
  catch { return <main className="night-sky-page"><Link href="/night-sky">Return to Night Sky</Link><p>Choose a year between 2000 and 2100.</p></main>; }
  const time = (value:string|null) => value ? timeFormatter.format(new Date(value)) : "No event";
  return <main className="night-sky-page">
    <Link href="/">← Maio Open API</Link>
    <p className="eyebrow">CALCULATED ASTRONOMY · CABO VERDE</p>
    <h1>Maio Night Sky</h1>
    <p>A full year of Sun, Moon and astronomical darkness for Maio. All displayed times are local (UTC−01:00).</p>
    <form action="/night-sky" method="get"><label htmlFor="year">Year </label><input id="year" name="year" type="number" min="2000" max="2100" defaultValue={data.year} required /><button type="submit">View year</button></form>
    <p><a href={`/api/v1/astronomy/almanac?year=${data.year}&limit=500`}>Read the full-year API ↗</a> · <a href="/api/v1/astronomy">Astronomy API</a> · <a href="/api/v1/openapi.json">OpenAPI specification</a></p>
    <p>Reference location: 15.25° N, 23.15° W; assumed sea level. The API also accepts coordinates within the Maio bounding box.</p>
    <p>These are calculations, not a weather forecast. Clouds, dust, light pollution and terrain can affect visibility. Moon illumination is calculated at 22:00; the Moon may be below the horizon.</p>
    <ConstellationsPanel search={search} year={data.year} />
    <h2>Annual Sun and Moon almanac</h2>
    <div className="night-sky-table"><table><caption>{data.numberMatched} days in {data.year}. Night ends the following morning; “No event” means no rise/set on that local date.</caption>
      <thead><tr>{["Date","Sunrise","Sunset","Night starts","Night ends (+1 day)","Moonrise","Moonset","Moon lit at 22:00"].map(t=><th key={t} scope="col">{t}</th>)}</tr></thead>
      <tbody>{data.records.map((r: {id:string;date:string;sunrise:string|null;sunset:string|null;moonrise:string|null;moonset:string|null;astronomicalNight:{start:string|null;end:string|null};moon:{illuminatedFraction:number}})=><tr key={r.id}><th scope="row">{r.date}</th><td>{time(r.sunrise)}</td><td>{time(r.sunset)}</td><td>{time(r.astronomicalNight.start)}</td><td>{time(r.astronomicalNight.end)}</td><td>{time(r.moonrise)}</td><td>{time(r.moonset)}</td><td>{(100*r.moon.illuminatedFraction).toFixed(1)}%</td></tr>)}</tbody>
    </table></div>
    <p>Calculated with <a href={data.model.url}>Astronomy Engine {data.model.version}</a> by Don Cross (MIT). <a href="/api/v1/sources/astronomy-engine">Source and calculation provenance</a>. Astronomical darkness begins when the Sun’s centre drops below −18°.</p>
  </main>;
}
