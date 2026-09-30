import * as A from "astronomy-engine";
import { createHash } from "node:crypto";
import {
  constellationCatalog as catalog,
  constellationCaveats,
} from "./constellations.mjs";
import lines from "../data/astronomy/data-constellations.lines.json" with { type: "json" };
import { nightSkyModel } from "./night-sky.mjs";

function calculate(date, latitude, longitude) {
  const observer = new A.Observer(latitude, longitude, 0);
  const rotation = A.Rotation_EQJ_HOR(date, observer);
  const position = ([ra, dec]) => {
    const v = A.VectorFromSphere(new A.Spherical(dec, ra, 1), date);
    const p = A.HorizonFromVector(A.RotateVector(rotation, v), null);
    return { az: p.lon, alt: p.lat };
  };
  const constellations = catalog.records.map((record) => {
    const paths = lines.features
      .filter((f) => f.id === record.abbreviation)
      .flatMap((f) => f.geometry.coordinates)
      .map((line) => line.map(position));
    const points = paths.flat();
    const ref = record.referencePoints[0];
    return {
      id: record.id,
      name: record.name,
      abbreviation: record.abbreviation,
      paths,
      center: position([ref.rightAscensionHours * 15, ref.declinationDegrees]),
      above: points.some((p) => p.alt > 0),
      count: record.figureStars.length,
      highest: points.reduce((a, b) => (a.alt > b.alt ? a : b)),
    };
  });
  const sun = A.Equator(A.Body.Sun, date, observer, true, true);
  return {
    constellations,
    sunAltitude: A.Horizon(date, observer, sun.ra, sun.dec, null).altitude,
  };
}

export function querySkyMap(params, error) {
  const fail = (message) => {
    throw error(400, message);
  };
  for (const [key, value] of params) {
    if (
      !["at", "latitude", "longitude"].includes(key) ||
      params.getAll(key).length !== 1 ||
      value.length > 100
    )
      fail(`Invalid or duplicate query parameter: ${key}`);
  }
  const at = params.get("at");
  const match =
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(
      at || "",
    );
  if (
    !match ||
    +match[2] > 23 ||
    +match[3] > 59 ||
    +match[4] > 59 ||
    +match[6] > 23 ||
    +match[7] > 59 ||
    !Number.isFinite(Date.parse(at)) ||
    new Date(`${match[1]}T00:00:00Z`).toISOString().slice(0, 10) !== match[1]
  )
    fail("at must be a valid RFC 3339 instant with timezone and seconds.");
  const date = new Date(at);
  if (date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 2100)
    fail("at must be within UTC years 2000–2100.");
  if (params.has("latitude") !== params.has("longitude"))
    fail("Provide latitude and longitude together.");
  const coordinate = (key, fallback, min, max) => {
    if (!params.has(key)) return fallback;
    const value = params.get(key);
    if (!/^-?\d+(?:\.\d{1,6})?$/.test(value) || +value < min || +value > max)
      fail(`${key} must be within ${min} to ${max}, with at most 6 decimals.`);
    return +value;
  };
  const latitude = coordinate("latitude", 15.25, -90, 90),
    longitude = coordinate("longitude", -23.15, -180, 180);
  const contractVersion = "1";
  const model = { ...nightSkyModel, skyMapContractVersion: contractVersion };
  const revision = createHash("sha256")
    .update(
      JSON.stringify({
        model,
        checksums: catalog.checksums,
        at: date.toISOString(),
        latitude,
        longitude,
      }),
    )
    .digest("hex")
    .slice(0, 16);
  const query = new URLSearchParams({
    at: date.toISOString(),
    latitude: String(latitude),
    longitude: String(longitude),
  });
  return {
    revision,
    status: "available",
    dataKind: "calculated-ephemeris",
    at: date.toISOString(),
    location: { type: "Point", coordinates: [longitude, latitude] },
    assumedElevationMetres: 0,
    model,
    sourceIds: [catalog.sourceId, "astronomy-engine"],
    catalogCommit: catalog.commit,
    retrievedAt: catalog.retrievedAt,
    coordinateFrame: "observer-horizon",
    caveats: [
      ...constellationCaveats,
      "Sky-map azimuth at zenith/nadir is an arbitrary rendering convention. Pattern vertex sizes do not encode stellar magnitude.",
    ],
    ...calculate(date, latitude, longitude),
    links: {
      self: `/api/v1/astronomy/sky-map?${query}`,
      sources: [
        `/api/v1/sources/${catalog.sourceId}`,
        "/api/v1/sources/astronomy-engine",
      ],
    },
  };
}
