import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveApi, jsonResponse } from "../lib/api.mjs";
const snapshot = JSON.parse(
  await readFile(new URL("../data/snapshot.json", import.meta.url)),
);
const api = (q) =>
  resolveApi(snapshot, ["astronomy", "sky-map"], new URLSearchParams(q));
const at = "2026-09-17T23:00:00Z";
test("sky map provides all 88 patterns worldwide, including both Serpens parts", () => {
  for (const [latitude, longitude] of [
    [15.25, -23.15],
    [-33.87, 151.21],
    [90, 0],
    [-90, 0],
  ]) {
    const b = api(`at=${at}&latitude=${latitude}&longitude=${longitude}`);
    assert.equal(b.constellations.length, 88);
    assert.equal(new Set(b.constellations.map((c) => c.id)).size, 88);
    assert.ok(b.constellations.find((c) => c.id === "ser").paths.length >= 2);
    for (const c of b.constellations) {
      assert.ok(c.paths.length);
      const points = c.paths.flat();
      assert.equal(
        c.above,
        points.some((p) => p.alt > 0),
      );
      assert.equal(c.highest.alt, Math.max(...points.map((p) => p.alt)));
      for (const p of points) {
        assert.ok(p.az >= 0 && p.az < 360);
        assert.ok(p.alt >= -90 && p.alt <= 90);
      }
    }
  }
});
test("map agrees with the existing Maio summaries, changes with time, and retains source metadata", () => {
  const map = api(`at=${at}`),
    old = resolveApi(
      snapshot,
      ["night-sky", "constellations"],
      new URLSearchParams({ at }),
    );
  assert.equal(map.sunAltitude, old.sunAltitudeDegrees);
  assert.deepEqual(map.sourceIds, old.sourceIds);
  for (const c of map.constellations) {
    const r = old.records.find((r) => r.id === c.id);
    assert.equal(c.count, r.pattern.starCount);
    assert.ok(
      Math.abs(c.highest.alt - r.pattern.maximumAltitudeDegrees) < 1e-9,
    );
    assert.equal(c.center.alt, r.referencePoints[0].altitudeDegrees);
    assert.equal(c.above, r.aboveHorizon);
  }
  assert.ok(api("at=2026-09-17T14:00:00Z").sunAltitude > 0);
  assert.ok(map.sunAltitude < -18);
  assert.notDeepEqual(
    map.constellations,
    api("at=2026-09-17T14:00:00Z").constellations,
  );
});
test("sky map rejects malformed inputs and preserves older geographic restrictions", () => {
  for (const q of [
    "",
    `at=${at}&latitude=91&longitude=0`,
    `at=${at}&latitude=0`,
    `at=${at}&x=1`,
    `at=${at}&latitude=0&longitude=181`,
    `at=${at}&latitude=0&latitude=1&longitude=0`,
    "at=2026-02-30T23:00:00Z",
    "at=2101-01-01T00:00:00Z",
  ])
    assert.throws(
      () => api(q),
      (e) => e.status === 400,
      q,
    );
  assert.throws(
    () =>
      resolveApi(
        snapshot,
        ["night-sky", "constellations"],
        new URLSearchParams({ at, latitude: "0", longitude: "0" }),
      ),
    (e) => e.status === 400,
  );
});
test("equivalent instants keep the same revision, links resolve and ETags support 304", () => {
  const b = api(`at=${at}`),
    same = api(new URLSearchParams({ at: "2026-09-17T22:00:00-01:00" }));
  assert.equal(b.revision, same.revision);
  assert.deepEqual(
    api(new URL(b.links.self, "https://example.org").searchParams),
    b,
  );
  const r = jsonResponse(b, new Request("https://example.org"), b.revision);
  assert.equal(
    jsonResponse(
      b,
      new Request("https://example.org", {
        headers: { "If-None-Match": r.headers.get("etag") },
      }),
      b.revision,
    ).status,
    304,
  );
});
