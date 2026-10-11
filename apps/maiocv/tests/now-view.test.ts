import { strict as assert } from "node:assert";
import { test } from "node:test";
import { loadAgora } from "../lib/agora.ts";
import { formatMaioTime, nowCards, retrievedLabel } from "../lib/now-view.ts";

const now = new Date("2026-10-11T19:30:00.000Z");

test("astronomy UTC timestamps render in Atlantic/Cape_Verde", () => {
  assert.equal(formatMaioTime("2026-10-11T19:30:00.000Z", "pt"), "18:30");
  const label = retrievedLabel("2026-10-11T19:30:00.000Z", "en");
  assert.match(label, /Retrieved 18:30/);
  assert.doesNotMatch(label, /updated/i);
});

test("every agora value keeps a source line", async () => {
  const body = await loadAgora((async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("marine-api")) return Response.json({ current: { wave_height: 1.1, sea_surface_temperature: 26 } });
    if (url.includes("wind_speed")) return Response.json({ current_units: { wind_speed_10m: "km/h" }, current: { wind_speed_10m: 18, wind_direction_10m: 40 } });
    if (url.includes("open-meteo.com")) {
      return Response.json({
        current: { temperature_2m: 28, relative_humidity_2m: 60, precipitation: 0, weathercode: 1 },
        daily: { time: ["2026-10-11"], temperature_2m_min: [24], temperature_2m_max: [30], weathercode: [1] },
      });
    }
    if (url.includes("/astronomy/sky")) {
      return Response.json({ solarEvents: { sunset: "2026-10-11T19:30:00.000Z" }, moon: { illuminatedFraction: 0.5 }, sourceUpdatedAt: null });
    }
    return Response.json({});
  }) as typeof fetch, now);
  const cards = nowCards(body, "en");
  assert.equal(cards.length, 4);
  for (const card of cards) {
    assert.ok(card.source.length > 0, card.id);
    assert.match(card.source, /Open-Meteo|Astronomy Engine/);
    assert.doesNotMatch(card.source, /\bUpdated\b/);
  }
  assert.match(cards[3]?.primary ?? "", /18:30/);
});
