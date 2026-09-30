import test from "node:test";
import assert from "node:assert/strict";
import { project, deviceView } from "../lib/sky.mjs";
const near = (a, b, tolerance = 1e-6) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
test("perspective projection centers target and handles wrap, roll and rear hemisphere", () => {
  const v = { az: 359, alt: 35, roll: 0 };
  const p = project(v, v, 800, 600, 90);
  near(p.x, 400);
  near(p.y, 300);
  assert.ok(project({ az: 1, alt: 35 }, v, 800, 600, 90).x > 400);
  assert.equal(project({ az: 179, alt: -35 }, v, 800, 600, 90), null);
  const upright = project(
    { az: 10, alt: 0 },
    { az: 0, alt: 0, roll: 0 },
    800,
    600,
    90,
  );
  const rolled = project(
    { az: 10, alt: 0 },
    { az: 0, alt: 0, roll: 90 },
    800,
    600,
    90,
  );
  near(rolled.x, 400);
  near(300 - rolled.y, upright.x - 400);
});
test("rear camera orientation follows north, east, tilt and screen rotation", () => {
  near(deviceView(0, 90, 0).az, 0);
  near(deviceView(0, 90, 0).alt, 0);
  near(deviceView(270, 90, 0).az, 90);
  near(deviceView(0, 135, 0).alt, 45);
  near(deviceView(0, 90, 0, 90).roll, 90);
  near(deviceView(120, 45, 0, 0, 90).az, 90);
});
