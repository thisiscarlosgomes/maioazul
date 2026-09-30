export const parameters = [
  ['temperature','weather','°C','Air temperature at 2 m'],
  ['rainfall','weather','mm','Rain over source interval; not total precipitation'],
  ['precipitation','weather','mm','Total precipitation over source interval'],
  ['humidity','weather','%','Relative humidity at 2 m'],
  ['wind-speed','weather','km/h','Wind speed at 10 m'],
  ['wind-direction','weather','°','Meteorological direction at 10 m'],
  ['atmospheric-pressure','weather','hPa','Surface pressure'],
  ['sea-temperature','ocean','°C','Sea surface temperature'],
  ['wave-height','ocean','m','Significant wave height'],
  ['wave-period','ocean','s','Wave period'],
  ['water-level','ocean','m','Water level; vertical datum required'],
  ['current-speed','ocean','m/s','Current speed; depth required'],
  ['current-direction','ocean','°','Current direction; convention and depth required'],
  ['water-flow','water','m³/s','Water flow rate'],
  ['water-quality-ph','water','pH','Water pH'],
  ['energy-power','energy','kW','Instantaneous power'],
  ['energy-consumption','energy','kWh','Energy over stated interval'],
  ['pm2-5','air','μg/m³','Particulate matter PM2.5'],
  ['pm10','air','μg/m³','Particulate matter PM10'],
  ['carbon-monoxide','air','μg/m³','Carbon monoxide'],
  ['nitrogen-dioxide','air','μg/m³','Nitrogen dioxide'],
  ['ozone','air','μg/m³','Ozone'],
].map(([id,domain,unit,description])=>({id,domain,unit,description}));
export const providers = [
  { id:'open-meteo-weather', endpoint:'https://api.open-meteo.com/v1/forecast', docs:'https://open-meteo.com/en/docs', attribution:'Open-Meteo and its weather model providers', variables:{temperature_2m:'temperature',rain:'rainfall',precipitation:'precipitation',relative_humidity_2m:'humidity',wind_speed_10m:'wind-speed',wind_direction_10m:'wind-direction',surface_pressure:'atmospheric-pressure'} },
  { id:'open-meteo-marine', endpoint:'https://marine-api.open-meteo.com/v1/marine', docs:'https://open-meteo.com/en/docs/marine-weather-api', attribution:'Open-Meteo and its marine model providers', variables:{sea_surface_temperature:'sea-temperature',wave_height:'wave-height',wave_period:'wave-period'} },
  { id:'open-meteo-air', endpoint:'https://air-quality-api.open-meteo.com/v1/air-quality', docs:'https://open-meteo.com/en/docs/air-quality-api', attribution:'Open-Meteo / CAMS ENSEMBLE and CAMS global atmospheric composition forecasts', variables:{pm2_5:'pm2-5',pm10:'pm10',carbon_monoxide:'carbon-monoxide',nitrogen_dioxide:'nitrogen-dioxide',ozone:'ozone'} },
];
export function normalizeEnvironment(bundle) {
  const observations=[];
  for(const entry of bundle.entries) {
    const provider=providers.find(p=>p.id===entry.sourceId);
    if(!provider) throw Error(`Unknown environmental source ${entry.sourceId}`);
    const raw=entry.payload, current=raw.current;
    if(!current || !Number.isFinite(current.time) || !Number.isFinite(raw.latitude) || !Number.isFinite(raw.longitude) || Math.abs(raw.latitude)>90 || Math.abs(raw.longitude)>180) throw Error(`Invalid response from ${entry.sourceId}`);
    const validAt=new Date(current.time*1000).toISOString();
    for(const [variable,parameter] of Object.entries(provider.variables)) {
      const value=current[variable],unit=raw.current_units?.[variable];
      if(value===null || value===undefined) continue;
      if(typeof value!=='number' || !Number.isFinite(value) || typeof unit!=='string') throw Error(`Invalid ${variable} value or unit`);
      observations.push({
        id:`${provider.id}-${variable}-${current.time}`, observedAt:validAt, validAt,
        observationKind:'model-estimate', sensorId:null, featureId:null,
        sourceId:provider.id, sourceRecordId:`current/${current.time}/${variable}`,
        parameter,value,unit,geometry:{type:'Point',coordinates:[raw.longitude,raw.latitude]},
        intervalSeconds:Number.isFinite(current.interval)?current.interval:null,
        retrievedAt:entry.retrievedAt, updatedAt:null, quality:'unverified',
        caveats:['Model-based estimate at the provider grid cell, not a physical sensor reading. observedAt is the model valid time retained for contract compatibility. Snapshot only; not a continuously refreshed feed.'],
      });
    }
  }
  return observations.sort((a,b)=>a.id.localeCompare(b.id));
}
