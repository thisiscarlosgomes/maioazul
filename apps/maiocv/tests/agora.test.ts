import { strict as assert } from "node:assert";
import { test } from "node:test";
import { loadAgora, maioClock } from "../lib/agora.ts";

const now = new Date("2026-10-11T12:17:00.000Z");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function fakeFetch(marineStatus = 200): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("marine-api")) {
      if (marineStatus !== 200) return json({ error: "down" }, marineStatus);
      return json({ current: { wave_height: 1.2, sea_surface_temperature: 26.4 } });
    }
    if (url.includes("wind_speed_10m")) {
      assert.match(url, /wind_speed_unit=kmh/);
      return json({
        current_units: { wind_speed_10m: "km/h" },
        current: { wind_speed_10m: 22.4, wind_direction_10m: 125 },
      });
    }
    if (url.includes("api.open-meteo.com")) {
      return json({
        current: { temperature_2m: 27.1, relative_humidity_2m: 70, precipitation: 0, weathercode: 1 },
        daily: {
          time: ["2026-10-11"],
          temperature_2m_min: [24],
          temperature_2m_max: [29],
          weathercode: [1],
        },
      });
    }
    if (url.includes("/astronomy/sky")) {
      assert.match(url, /date=2026-10-11/);
      assert.match(url, /time=11:17/);
      return json({
        at: "2026-10-11T12:17:00.000Z",
        sourceUpdatedAt: null,
        caveats: ["Calculated astronomical events, not observations."],
        solarEvents: { sunset: "2026-10-11T19:30:00.000Z" },
        moon: { illuminatedFraction: 0.4 },
        isAstronomicalDarkness: false,
        model: { id: "astronomy-engine", attribution: "Calculated with Astronomy Engine", url: "https://github.com/cosinekitty/astronomy" },
      });
    }
    if (url.includes("/astronomy/moon")) {
      return json({ caveats: ["Moon phase is evaluated at the requested local time."], moon: { illuminatedFraction: 0.41 } });
    }
    return json({ error: "unexpected" }, 404);
  }) as typeof fetch;
}

function keys(value: unknown, found = new Set<string>()): Set<string> {
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      found.add(key);
      keys(child, found);
    }
  }
  return found;
}

test("Maio local clock is Atlantic/Cape_Verde", () => {
  assert.deepEqual(maioClock(now), { date: "2026-10-11", time: "11:17" });
});

test("agora returns four envelopes and does not call retrievedAt updated", async () => {
  const body = await loadAgora(fakeFetch(), now);
  assert.equal(body.weather.status, "available");
  assert.equal(body.weather.kind, "model-estimate");
  assert.equal(body.weather.data?.temperature, 27.1);
  assert.equal(body.weather.retrievedAt, now.toISOString());
  assert.equal(body.sea.data?.wave_height, 1.2);
  assert.match(body.sea.caveats[0] ?? "", /not a beach-specific surf forecast/);
  assert.equal(body.wind.data?.unit, "km/h");
  assert.equal(body.wind.data?.speed, 22.4);
  assert.equal(body.sky.kind, "calculated");
  assert.equal(body.sky.source.id, "astronomy-engine");
  assert.equal(body.sky.sourceUpdatedAt, null);
  assert.equal(body.sky.validAt, "2026-10-11T12:17:00.000Z");
  const names = keys(body);
  assert.equal(names.has("updated"), false);
  assert.equal(names.has("updated_at"), false);
  assert.equal(names.has("retrievedAt"), true);
});

test("one upstream failure marks only that envelope unavailable", async () => {
  const body = await loadAgora(fakeFetch(500), now);
  assert.equal(body.sea.status, "unavailable");
  assert.equal(body.sea.data, null);
  assert.equal(body.weather.status, "available");
  assert.equal(body.wind.status, "available");
  assert.equal(body.sky.status, "available");
});
