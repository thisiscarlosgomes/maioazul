export const radians = Math.PI / 180;
export const wrap = (angle) => ((angle % 360) + 360) % 360;
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
// Perspective projection: azimuth clockwise from north, altitude from horizon.
export function project(point, view, width, height, fov) {
  const d = (point.az - view.az) * radians,
    a = point.alt * radians,
    b = view.alt * radians;
  const x = Math.cos(a) * Math.sin(d);
  const y = Math.sin(a) * Math.cos(b) - Math.cos(a) * Math.cos(d) * Math.sin(b);
  const z = Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(d) * Math.cos(b);
  if (z <= 0.08) return null;
  const roll = (view.roll || 0) * radians,
    scale = Math.min(width, height) / (2 * Math.tan((fov * radians) / 2));
  return {
    x: width / 2 + ((x * Math.cos(roll) - y * Math.sin(roll)) * scale) / z,
    y: height / 2 - ((x * Math.sin(roll) + y * Math.cos(roll)) * scale) / z,
  };
}
// W3C intrinsic Z-X-Y rotation, rear-facing direction = device negative Z.
export function deviceView(
  alpha,
  beta,
  gamma,
  screenAngle = 0,
  compassHeading = null,
) {
  const a = alpha * radians,
    b = beta * radians,
    g = gamma * radians;
  const rotate = ([x, y, z]) => {
    const xx = Math.cos(g) * x + Math.sin(g) * z,
      zz = -Math.sin(g) * x + Math.cos(g) * z;
    const yy = Math.cos(b) * y - Math.sin(b) * zz,
      zzz = Math.sin(b) * y + Math.cos(b) * zz;
    return [
      Math.cos(a) * xx - Math.sin(a) * yy,
      Math.sin(a) * xx + Math.cos(a) * yy,
      zzz,
    ];
  };
  let [east, north, up] = rotate([0, 0, -1]);
  const angle = screenAngle * radians;
  let top = rotate([Math.sin(angle), Math.cos(angle), 0]);
  if (compassHeading !== null) {
    const deviceTop = rotate([0, 1, 0]);
    const offset =
      (compassHeading - Math.atan2(deviceTop[0], deviceTop[1]) / radians) *
      radians;
    const turn = ([e, n, u]) => [
      e * Math.cos(offset) + n * Math.sin(offset),
      n * Math.cos(offset) - e * Math.sin(offset),
      u,
    ];
    [east, north, up] = turn([east, north, up]);
    top = turn(top);
  }
  const az = wrap(Math.atan2(east, north) / radians),
    alt = Math.asin(clamp(up, -1, 1)) / radians;
  const ar = az * radians,
    br = alt * radians;
  const right = top[0] * Math.cos(ar) - top[1] * Math.sin(ar);
  const vertical =
    -top[0] * Math.sin(ar) * Math.sin(br) -
    top[1] * Math.cos(ar) * Math.sin(br) +
    top[2] * Math.cos(br);
  return { az, alt, roll: Math.atan2(right, vertical) / radians };
}
export function direction(az) {
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
    Math.round(wrap(az) / 45) % 8
  ];
}
