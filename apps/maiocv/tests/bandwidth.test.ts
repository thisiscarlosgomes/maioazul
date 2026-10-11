import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { bandwidthMode } from "../lib/bandwidth.ts";
import { evictionUrls, isSearchQuery, mayCacheNavigation, mayStoreNavigation, offlineBanner } from "../public/sw-policy.mjs";

test("Save-Data turns lite on only while the choice is auto", () => {
  assert.equal(bandwidthMode(null, "on"), "low");
  assert.equal(bandwidthMode("auto", "on"), "low");
  assert.equal(bandwidthMode("off", "on"), "normal");
  assert.equal(bandwidthMode("on", null), "low");
  assert.equal(bandwidthMode("auto", null), "normal");
});

test("only a successful same-origin page is cached, and offline copy shows when it was saved", () => {
  assert.equal(mayCacheNavigation({ ok: true, redirected: false, type: "basic" }), true);
  assert.equal(mayCacheNavigation({ ok: false, redirected: false, type: "basic" }), false);
  assert.equal(mayCacheNavigation({ ok: true, redirected: true, type: "basic" }), false);
  assert.equal(mayCacheNavigation({ ok: true, redirected: false, type: "opaqueredirect" }), false);
  const today = new Date("2026-10-11T21:00:00.000Z");
  const banner = offlineBanner("/en/essentials", "2026-10-11T19:30:00.000Z", today);
  assert.match(banner, /You are offline\. Showing saved information\./);
  assert.match(banner, /Saved 18:30/);
  assert.doesNotMatch(banner, /Oct/);
  assert.match(banner, /Schedules may have changed — confirm online\./);
  const older = offlineBanner("/en/essentials", "2026-10-10T19:30:00.000Z", today);
  assert.match(older, /10 Oct/);
  assert.match(older, /18:30/);
  assert.match(offlineBanner("/pt/essenciais", "2026-10-11T19:30:00.000Z", today), /Guardado 18:30/);
  assert.match(offlineBanner("/pt/essenciais", "2026-10-10T19:30:00.000Z", today), /10\/10/);
  assert.match(offlineBanner("/fr/essentiels", "2026-10-11T19:30:00.000Z", today), /Enregistré 18:30/);
  assert.match(offlineBanner("/fr/essentiels", "2026-10-10T19:30:00.000Z", today), /10 oct/);
  const ok = { ok: true, redirected: false, type: "basic" };
  assert.equal(mayStoreNavigation(new URL("https://maio.cv/en/search?q=praia"), ok), false);
  assert.equal(mayStoreNavigation(new URL("https://maio.cv/search?q=praia"), ok), false);
  assert.equal(isSearchQuery(new URL("https://maio.cv/en/search")), false);
  assert.equal(mayStoreNavigation(new URL("https://maio.cv/en/essentials"), ok), true);
  const cached = [
    "https://maio.cv/pt",
    "https://maio.cv/offline.html",
    ...Array.from({ length: 9 }, (_, index) => `https://maio.cv/en/page-${index}`),
  ];
  assert.deepEqual(evictionUrls(cached, 8, ["/pt", "/offline.html"]), ["https://maio.cv/en/page-0"]);
  const worker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(worker, /mayStoreNavigation/);
  assert.match(worker, /evictionUrls/);
  assert.match(worker, /\/api\/maio-chat/);
  assert.match(worker, /caches\.delete/);
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const rule = css.match(/\.lite-banner \{[^}]+\}/);
  assert.ok(rule);
  assert.match(rule[0], /var\(--maio-surface-data\)/);
  assert.doesNotMatch(rule[0], /#f2f5ec/);
});
