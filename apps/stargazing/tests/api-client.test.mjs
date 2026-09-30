import test from "node:test";
import assert from "node:assert/strict";
import { fetchSky } from "../lib/api-client.mjs";
test("client uses the proxy and forwards exact location/time and cancellation", async () => {
  const signal = new AbortController().signal;
  const body = {
    status: "available",
    sunAltitude: -20,
    constellations: [
      {
        id: "ori",
        center: { az: 90, alt: 30 },
        highest: { az: 90, alt: 35 },
        paths: [[{ az: 90, alt: 30 }]],
      },
    ],
  };
  const result = await fetchSky(
    "at=2026-09-17T23%3A00%3A00Z&latitude=15.250000&longitude=-23.150000",
    signal,
    async (url, options) => {
      assert.ok(url.startsWith("/api/sky?at="));
      assert.ok(url.includes("latitude=15.250000"));
      assert.equal(options.signal, signal);
      assert.equal(options.cache, "no-store");
      return Response.json(body);
    },
  );
  assert.deepEqual(result, body);
});
test("API failures and malformed payloads cannot masquerade as a sky map", async () => {
  const signal = new AbortController().signal;
  await assert.rejects(
    fetchSky("", signal, async () =>
      Response.json({ error: { message: "Unavailable" } }, { status: 502 }),
    ),
    /Unavailable/,
  );
  await assert.rejects(
    fetchSky("", signal, async () =>
      Response.json({
        status: "available",
        sunAltitude: 0,
        constellations: [],
      }),
    ),
    /unsupported sky map/,
  );
});
