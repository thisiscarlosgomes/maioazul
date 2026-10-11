import { strict as assert } from "node:assert";
import { test } from "node:test";
import { bandwidthMode } from "../lib/bandwidth.ts";

test("Save-Data turns lite on only while the choice is auto", () => {
  assert.equal(bandwidthMode(null, "on"), "low");
  assert.equal(bandwidthMode("auto", "on"), "low");
  assert.equal(bandwidthMode("off", "on"), "normal");
  assert.equal(bandwidthMode("on", null), "low");
  assert.equal(bandwidthMode("auto", null), "normal");
});
