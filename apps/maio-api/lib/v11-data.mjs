// Additive taxonomy: source features keep their original IDs and memberships.
export const additionalCollections = [
  ["admin-boundaries", "Administrative boundaries", "Source-defined administrative boundaries; no inferred island polygon."],
  ["localities", "Localities", "Source locality records; discover canonical entities through /places."],
  ["schools", "Schools", "Explicitly classified education facilities."],
  ["health", "Health", "Explicitly classified healthcare facilities."],
  ["government", "Government", "Explicitly classified government offices and civic services."],
  ["heritage", "Heritage", "Source-classified historical and religious heritage."],
  ["land-use", "Land use", "Explicit source land-use classifications; not inferred legal zoning."],
  ["waste-infrastructure", "Waste infrastructure", "Explicit waste collection, recycling and treatment facilities."],
  ["connectivity", "Connectivity", "Explicit telecommunications infrastructure."],
].map(([id, title, description]) => ({ id, title, description }));

export function extendMemberships(feature) {
  const a = feature.properties.attributes;
  const ids = new Set(feature.properties.collections);
  if (ids.has("settlements")) ids.add("localities");
  if (a.boundary === "administrative") ids.add("admin-boundaries");
  if (["school", "kindergarten", "college", "university"].includes(a.amenity) || a.category === "education_center") ids.add("schools");
  if (["hospital", "clinic", "doctors", "dentist", "pharmacy"].includes(a.amenity) || (a.healthcare && a.healthcare !== "no")) ids.add("health");
  if (["townhall", "police", "courthouse", "fire_station"].includes(a.amenity) || a.office === "government") ids.add("government");
  if ((a.historic && a.historic !== "no") || ["historical_heritage", "religious_heritage"].includes(a.category)) ids.add("heritage");
  if (a.landuse && a.landuse !== "no") ids.add("land-use");
  if (["recycling", "waste_disposal", "waste_transfer_station"].includes(a.amenity) || a.man_made === "wastewater_plant") ids.add("waste-infrastructure");
  if ((a.telecom && a.telecom !== "no") || a["tower:type"] === "communication") ids.add("connectivity");
  feature.properties.collections = [...ids].sort();
}

export const datasetDefinitions = [
  ["population", "Population"], ["households", "Households"], ["housing", "Housing"],
  ["employment", "Employment"], ["education", "Education"], ["health", "Health"],
  ["water", "Water"], ["waste", "Waste"], ["biodiversity", "Biodiversity"],
  ["connectivity", "Connectivity"], ["business-demography", "Business demography"],
  ["municipal-finance", "Municipal finance"], ["municipal-budget", "Municipal budget"],
  ["public-procurement", "Public procurement"],
].map(([id, title]) => ({
  id, title, scope: "Maio", status: "planned", sourceIds: [],
  sourceUpdatedAt: null, updatedAt: null, retrievedAt: null,
  license: "Not specified by source", payload: null, records: [], recordsStatus: "planned",
  caveats: ["No validated structured source has been connected to this dataset. Planned coverage is not a statistical zero."],
}));

export function buildPlaces(registry, features, sources) {
  const byId = new Map(features.map(f => [f.id, f]));
  const seen = new Set();
  return registry.map(entry => {
    if (seen.has(entry.id)) throw new Error(`Duplicate place ID: ${entry.id}`);
    seen.add(entry.id);
    const defining = entry.featureIds.map(id => {
      const f = byId.get(id);
      if (!f || !f.properties.collections.includes("localities")) throw new Error(`Invalid place source: ${id}`);
      return f;
    });
    const related = (entry.relatedFeatures || []).map(relation => {
      if (!byId.has(relation.featureId)) throw new Error(`Invalid place association: ${relation.featureId}`);
      return relation;
    });
    const sourceIds = [...new Set(defining.flatMap(f => f.properties.sourceIds))].sort();
    return {
      id: entry.id, name: entry.name, type: entry.type || "locality",
      geometry: defining[0].geometry, geometrySourceFeatureId: defining[0].id,
      sourceIds, sourceFeatureIds: entry.featureIds,
      sourceTimestamps: sourceIds.map(sourceId => ({ sourceId, updatedAt: sources.find(s => s.id === sourceId)?.sourceUpdatedAt ?? null })),
      associations: related,
      caveats: ["Representative source geometry, not an administrative boundary. Associations are explicit and incomplete; absence does not imply no services."],
    };
  }).sort((a,b) => a.id.localeCompare(b.id));
}
