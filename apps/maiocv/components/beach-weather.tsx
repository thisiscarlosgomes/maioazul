"use client";
import { useEffect, useState } from "react";

type Weather = {
  current: { temperature_2m: number; wind_speed_10m: number; time: string };
  daily: { temperature_2m_min: number[]; temperature_2m_max: number[] };
};
export function BeachWeather() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=15.25&longitude=-23.15&current=temperature_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=Atlantic%2FCape_Verde&forecast_days=1",
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Weather unavailable");
        return response.json();
      })
      .then((data) => {
        if (
          !Number.isFinite(data.current?.temperature_2m) ||
          !data.daily?.temperature_2m_min?.length
        )
          throw new Error("Invalid weather");
        setWeather(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);
  return (
    <div className="beach-weather" aria-live="polite">
      {weather ? (
        <>
          <strong>
            {Math.round(weather.current.temperature_2m)}°C <span>no Maio</span>
          </strong>
          <span>
            {Math.round(weather.daily.temperature_2m_min[0])}° /{" "}
            {Math.round(weather.daily.temperature_2m_max[0])}° · Vento{" "}
            {weather.current.wind_speed_10m} km/h
          </span>
          <small>
            Open-Meteo · {weather.current.time.replace("T", " · ")} (hora local)
          </small>
        </>
      ) : (
        <span>
          {failed
            ? "Meteorologia indisponível de momento."
            : "A consultar o tempo no Maio…"}
        </span>
      )}
    </div>
  );
}
