import type { Constellation } from "./sky.mjs";
export type SkyResponse = {
  status: "available";
  revision: string;
  at: string;
  constellations: Constellation[];
  sunAltitude: number;
  location: { type: "Point"; coordinates: number[] };
};
export function fetchSky(
  query: string,
  signal: AbortSignal,
  request?: typeof fetch,
): Promise<SkyResponse>;
