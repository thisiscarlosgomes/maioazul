export type Point = { az: number; alt: number };
export type View = Point & { roll?: number };
export type Constellation = {
  id: string;
  name: string;
  abbreviation: string;
  paths: Point[][];
  center: Point;
  above: boolean;
  count: number;
  highest: Point;
};
export const radians: number;
export function wrap(angle: number): number;
export function clamp(n: number, min: number, max: number): number;
export function project(
  point: Point,
  view: View,
  width: number,
  height: number,
  fov: number,
): { x: number; y: number } | null;
export function deviceView(
  alpha: number,
  beta: number,
  gamma: number,
  screenAngle?: number,
  compassHeading?: number | null,
): Required<View>;
export function direction(az: number): string;
