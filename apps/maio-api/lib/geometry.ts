export type Geometry = { type: string; coordinates: unknown } | null;
export function lines(value: unknown): number[][][] {
  if (!Array.isArray(value) || !value.length) return [];
  if (typeof value[0] === "number") return [[value as number[]]];
  if (Array.isArray(value[0]) && typeof value[0][0] === "number")
    return [value as number[][]];
  return value.flatMap(lines);
}
export function project(p: number[]) {
  return [(p[0] + 23.3) * 1700 + 42, (15.4 - p[1]) * 1760 + 12];
}
export function paths(geometry: Geometry) {
  return lines(geometry?.coordinates).map(
    (line) =>
      line
        .filter(
          (_, i) =>
            i % Math.max(1, Math.floor(line.length / 70)) === 0 ||
            i === line.length - 1,
        )
        .map(
          (p, i) =>
            `${i ? "L" : "M"}${project(p)
              .map((v) => v.toFixed(1))
              .join(",")}`,
        )
        .join(" ") + (geometry?.type.includes("Polygon") ? "Z" : ""),
  );
}
