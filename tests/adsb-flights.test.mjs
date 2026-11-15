import assert from "node:assert/strict";
import test from "node:test";
import {
  ADSB_API_KEY_ENV,
  CABO_VERDE_RADIUS_NM,
  FLIGHT_CACHE_TTL_MS,
  MAIO_LATITUDE,
  MAIO_LONGITUDE,
  cacheControlFor,
  caboVerdeFlightsUrl,
  createAdsbCache,
  loadCaboVerdeFlights,
  nauticalMilesBetween,
  normalizeAircraft,
  parseRetryAfterSeconds,
  readAdsbApiKey,
} from "../lib/adsb/flights.ts";

const FIXTURE_KEY = "test-adsb-key";

function envelope(aircraft) {
  return {
    ac: aircraft,
    ctime: 1,
    msg: "No error",
    now: 1,
    ptime: 1,
    total: aircraft.length,
  };
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function sampleAircraft() {
  return envelope([
    {
      hex: "nogps",
      flight: "SKIP",
      alt_baro: 1000,
    },
    {
      hex: "far01",
      flight: "   ",
      r: "D4-TEST",
      t: "AT76",
      lat: 16.7,
      lon: -22.9,
      alt_baro: "ground",
      gs: 0,
      track: 180,
      dst: 90.2,
      dir: 40,
      seen: 4,
      emergency: "none",
    },
    {
      hex: "near01",
      flight: "VR4071  ",
      r: "D4-TEST",
      t: "AT76",
      lat: 15.2,
      lon: -23.2,
      alt_baro: 12000,
      gs: 210.4,
      track: 35,
      dst: 12.4,
      dir: 90,
      seen: 1,
      emergency: "general",
    },
  ]);
}

test("the Maio circle covers Cabo Verde and stays inside the API cap", () => {
  assert.equal(Number.isInteger(CABO_VERDE_RADIUS_NM), true);
  assert.ok(CABO_VERDE_RADIUS_NM >= 1 && CABO_VERDE_RADIUS_NM <= 250);
  const inside = [
    ["Praia", 14.9245, -23.4935],
    ["Sal", 16.7414, -22.9494],
    ["Boa Vista", 16.1365, -22.8889],
    ["São Vicente", 16.8332, -25.0544],
    ["Santo Antão", 17.116, -25.172],
    ["Fogo", 14.945, -24.381],
    ["Brava", 14.865, -24.703],
  ];
  for (const [name, latitude, longitude] of inside) {
    const distance = nauticalMilesBetween(
      MAIO_LATITUDE,
      MAIO_LONGITUDE,
      latitude,
      longitude,
    );
    assert.ok(
      distance < CABO_VERDE_RADIUS_NM,
      `${name} is ${distance.toFixed(1)} nm from Maio`,
    );
  }
  assert.ok(
    nauticalMilesBetween(MAIO_LATITUDE, MAIO_LONGITUDE, 38.774, -9.134) >
      CABO_VERDE_RADIUS_NM,
  );
  assert.equal(
    caboVerdeFlightsUrl(),
    "https://api.adsb.lol/v2/lat/15.25/lon/-23.15/dist/180",
  );
});

test("a missing or blank key never calls adsb.lol", async () => {
  for (const env of [
    {},
    { [ADSB_API_KEY_ENV]: "" },
    { [ADSB_API_KEY_ENV]: "  " },
    { [ADSB_API_KEY_ENV]: "bad\r\nX-Injected: 1" },
  ]) {
    let called = false;
    const payload = await loadCaboVerdeFlights({
      now: 1_000,
      env,
      cache: createAdsbCache(),
      fetchImpl: async () => {
        called = true;
        return jsonResponse(envelope([]));
      },
    });
    assert.equal(called, false);
    assert.equal(payload.status, "unconfigured");
    assert.deepEqual(payload.aircraft, []);
    assert.equal(cacheControlFor(payload), "no-store");
    assert.equal(JSON.stringify(payload).includes(FIXTURE_KEY), false);
  }
  assert.equal(readAdsbApiKey({ [ADSB_API_KEY_ENV]: "  secret  " }), "secret");
});

test("positions are normalized, ordered, and requested with the key header", async () => {
  const calls = [];
  const payload = await loadCaboVerdeFlights({
    now: Date.parse("2026-11-15T12:00:00Z"),
    env: { [ADSB_API_KEY_ENV]: FIXTURE_KEY },
    cache: createAdsbCache(),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(sampleAircraft());
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, caboVerdeFlightsUrl());
  assert.equal(calls[0].init.headers["x-api-key"], FIXTURE_KEY);
  assert.equal(calls[0].url.includes(FIXTURE_KEY), false);
  assert.equal(payload.status, "available");
  assert.equal(payload.stale, false);
  assert.deepEqual(
    payload.aircraft.map((plane) => plane.hex),
    ["near01", "far01"],
  );
  assert.equal(payload.aircraft[0].callsign, "VR4071");
  assert.equal(payload.aircraft[0].altitudeFeet, 12000);
  assert.equal(payload.aircraft[0].onGround, false);
  assert.equal(payload.aircraft[0].emergency, "general");
  assert.equal(payload.aircraft[1].callsign, null);
  assert.equal(payload.aircraft[1].onGround, true);
  assert.equal(payload.aircraft[1].registration, "D4-TEST");
  assert.equal(JSON.stringify(payload).includes(FIXTURE_KEY), false);
  assert.equal(
    cacheControlFor(payload),
    "public, max-age=180, s-maxage=180, stale-while-revalidate=60",
  );
});

test("a warm cache and an in-flight request share one upstream call", async () => {
  let calls = 0;
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const cache = createAdsbCache();
  const env = { [ADSB_API_KEY_ENV]: FIXTURE_KEY };
  const fetchImpl = async () => {
    calls += 1;
    await pending;
    return jsonResponse(sampleAircraft());
  };

  const first = loadCaboVerdeFlights({ now: 10_000, env, cache, fetchImpl });
  const second = loadCaboVerdeFlights({ now: 10_000, env, cache, fetchImpl });
  assert.equal(calls, 1);
  release();
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a.aircraft.length, 2);
  assert.equal(b.aircraft.length, 2);

  const third = await loadCaboVerdeFlights({
    now: 10_000 + FLIGHT_CACHE_TTL_MS - 1,
    env,
    cache,
    fetchImpl,
  });
  assert.equal(calls, 1);
  assert.equal(third.stale, false);
  assert.equal(third.retrievedAt, a.retrievedAt);
});

test("429 honors Retry-After and serves the last positions instead of calling again", async () => {
  const cache = createAdsbCache();
  const env = { [ADSB_API_KEY_ENV]: FIXTURE_KEY };
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return jsonResponse(sampleAircraft());
    return jsonResponse("rate limit exceeded", 429, { "Retry-After": "40" });
  };

  const fresh = await loadCaboVerdeFlights({ now: 50_000, env, cache, fetchImpl });
  assert.equal(fresh.status, "available");

  const limited = await loadCaboVerdeFlights({
    now: 50_000 + FLIGHT_CACHE_TTL_MS,
    env,
    cache,
    fetchImpl,
  });
  assert.equal(calls, 2);
  assert.equal(limited.status, "available");
  assert.equal(limited.stale, true);
  assert.equal(limited.aircraft.length, 2);
  assert.equal(limited.retryAfterSeconds, 40);
  assert.equal(limited.retrievedAt, fresh.retrievedAt);

  const duringBackoff = await loadCaboVerdeFlights({
    now: 50_000 + FLIGHT_CACHE_TTL_MS + 1_000,
    env,
    cache,
    fetchImpl,
  });
  assert.equal(calls, 2);
  assert.equal(duringBackoff.stale, true);
  assert.equal(duringBackoff.retryAfterSeconds, 39);
  assert.equal(cacheControlFor(duringBackoff), "public, max-age=39, s-maxage=39");
});

test("a rate limit with no cached positions fails quietly", async () => {
  const payload = await loadCaboVerdeFlights({
    now: Date.parse("2026-11-15T00:00:30Z"),
    env: { [ADSB_API_KEY_ENV]: FIXTURE_KEY },
    cache: createAdsbCache(),
    fetchImpl: async () =>
      jsonResponse("rate limit exceeded", 429, {
        "Retry-After": "Sun, 15 Nov 2026 00:01:00 GMT",
      }),
  });
  assert.equal(payload.status, "unavailable");
  assert.deepEqual(payload.aircraft, []);
  assert.equal(payload.retryAfterSeconds, 30);
  assert.equal(parseRetryAfterSeconds(null, 0), 30);
  assert.equal(parseRetryAfterSeconds("0", 0), 1);
});

test("upstream failures and unusable bodies do not throw or send the key back", async () => {
  for (const fetchImpl of [
    async () => jsonResponse({ msg: "No error" }, 200),
    async () => new Response("nope", { status: 200 }),
    async () => jsonResponse({ error: "down" }, 502),
    async () => {
      throw new Error("network");
    },
  ]) {
    const payload = await loadCaboVerdeFlights({
      now: 5_000,
      env: { [ADSB_API_KEY_ENV]: FIXTURE_KEY },
      cache: createAdsbCache(),
      fetchImpl,
    });
    assert.equal(payload.status, "unavailable");
    assert.equal(payload.aircraft.length, 0);
    assert.equal(JSON.stringify(payload).includes(FIXTURE_KEY), false);
  }
  assert.equal(normalizeAircraft({ hex: "abc", lat: 91, lon: 0 }), null);
});
