export async function fetchSky(query, signal, request = fetch) {
  const response = await request(`/api/sky?${query}`, {
    signal,
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error?.message || "Maio API request failed.");
  if (
    body.status !== "available" ||
    !Number.isFinite(body.sunAltitude) ||
    !Array.isArray(body.constellations) ||
    !body.constellations.length ||
    body.constellations.some(
      (c) =>
        !c.id ||
        !c.center ||
        !c.highest ||
        !Array.isArray(c.paths) ||
        !c.paths.length,
    )
  ) {
    throw new Error("The Maio API returned an unsupported sky map.");
  }
  return body;
}
