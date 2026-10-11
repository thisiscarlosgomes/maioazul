import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { bandwidthMode } from "../lib/bandwidth.ts";
import { mayCacheNavigation, offlineBanner } from "../public/sw-policy.mjs";

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
  const banner = offlineBanner("/en/essentials", "2026-10-11T19:30:00.000Z");
  assert.match(banner, /You are offline\. Showing saved information\./);
  assert.match(banner, /Saved 18:30/);
  assert.match(banner, /Schedules may have changed — confirm online\./);
  assert.match(offlineBanner("/pt/essenciais", "2026-10-11T19:30:00.000Z"), /Guardado 18:30/);
  assert.match(offlineBanner("/fr/essentiels", "2026-10-11T19:30:00.000Z"), /Enregistré 18:30/);
  const worker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(worker, /mayCacheNavigation\(response\)/);
  assert.match(worker, /\/api\/maio-chat/);
  assert.match(worker, /caches\.delete/);
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const rule = css.match(/\.lite-banner \{[^}]+\}/);
  assert.ok(rule);
  assert.match(rule[0], /var\(--maio-surface-data\)/);
  assert.doesNotMatch(rule[0], /#f2f5ec/);
});
