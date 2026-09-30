import { queryConstellations } from "@/lib/constellations.mjs";
type Search = { skyDate?: string; skyTime?: string; latitude?: string; longitude?: string; year?: string };
type Position = { id: string; name: string; referencePoints: {name:string;altitudeDegrees:number;compassDirection:string|null}[]; pattern: {starsAboveHorizon:number;starCount:number} };
export default function ConstellationsPanel({ search, year }: {search:Search;year:number}) {
  const today = new Date(Date.now()-3600000).toISOString().slice(0,10);
  const date = search.skyDate ?? (Number(today.slice(0,4))===year ? today : `${year}-01-01`);
  const time = search.skyTime ?? "22:00";
  const latitude = search.latitude ?? "15.25", longitude = search.longitude ?? "-23.15";
  const params = new URLSearchParams({at:`${date}T${time}:00-01:00`,latitude,longitude,aboveHorizon:"true",limit:"100"});
  const apiParams = new URLSearchParams({date,time,latitude,longitude,aboveHorizon:"true"});
  let result;
  let error = "";
  try {
    if(!/^\d{2}:\d{2}$/.test(time)) throw new Error("Choose a valid local time (HH:MM).");
    result = queryConstellations(params,(message:string)=>new Error(message));
  } catch(e) { error = e instanceof Error ? e.message : "Unable to calculate constellation positions."; }
  return <section className="constellation-panel" aria-labelledby="constellation-heading">
    <h2 id="constellation-heading">Constellations above the horizon</h2>
    <p>Choose a date and local time. Directions and altitudes refer to each constellation’s chart reference point; the star-pattern count shows how much of its pattern is above the horizon.</p>
    <form action="/night-sky" method="get">
      <input type="hidden" name="year" value={year} />
      <label>Date <input aria-label="Constellation date" type="date" name="skyDate" min="2000-01-01" max="2100-12-31" defaultValue={date} required /></label>
      <label>Local time <input aria-label="Constellation local time" type="time" name="skyTime" defaultValue={time} required /></label>
      <label>Latitude <input type="number" name="latitude" min="15.05" max="15.4" step="0.000001" defaultValue={latitude} required /></label>
      <label>Longitude <input type="number" name="longitude" min="-23.3" max="-23.02" step="0.000001" defaultValue={longitude} required /></label>
      <button type="submit">Show constellations</button>
    </form>
    {error ? <p role="alert">{error}</p> : result && <>
      <p><strong>{result.numberMatched} patterns with stars above the horizon.</strong> {result.isAstronomicalDarkness ? "The Sun is below −18°: astronomical darkness." : "The Sun is above −18°: daylight or twilight; stars may be difficult or impossible to see."}</p>
      <p>Above the horizon does not guarantee visibility. This calculation excludes cloud cover, dust, light pollution and terrain, and does not describe the whole official constellation boundary.</p>
      <p><a href={`/api/v1/astronomy/constellations?${apiParams}`}>Read these constellation positions as JSON ↗</a></p>
      <div className="night-sky-table"><table>
        <caption>Reference-point positions at {date}, {time} (UTC−01:00). Azimuth directions use compass north. A reference point can be below the horizon while some pattern stars are above it.</caption>
        <thead><tr><th scope="col">Constellation</th><th scope="col">Reference point</th><th scope="col">Direction</th><th scope="col">Altitude</th><th scope="col">Pattern stars above</th></tr></thead>
        <tbody>{result.records.map((r:Position)=><tr key={r.id}><th scope="row">{r.name}</th><td>{r.referencePoints.map(p=><div key={p.name}>{p.name}</div>)}</td><td>{r.referencePoints.map(p=><div key={p.name}>{p.compassDirection ?? "Undefined at zenith/nadir"}</div>)}</td><td>{r.referencePoints.map(p=><div key={p.name}>{p.altitudeDegrees.toFixed(1)}°</div>)}</td><td>{r.pattern.starsAboveHorizon} / {r.pattern.starCount}</td></tr>)}</tbody>
      </table></div>
      <p>Star-pattern and label coordinates: <a href="/api/v1/sources/d3-celestial-constellations">d3-celestial, Olaf Frohn</a>. Horizon calculations: Astronomy Engine. All 88 constellations are supported; Serpens is grouped as one constellation with two reference points.</p>
    </>}
  </section>;
}
