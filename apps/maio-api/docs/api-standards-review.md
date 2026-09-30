# Maio API interoperability review

Reviewed 17 September 2026. Recommendations, not a claim of standards conformance.

Estonia provides several complementary models rather than one universal public API specification. Its data-description standard 2.0 uses DCAT 2, DCAT-AP 2.1.0 and Dublin Core. RIA's current ATV mirroring API distinguishes datasets, distributions, data services and data dictionaries. This is a useful catalog model; its authenticated publication workflow should not be copied into our anonymous read API. Statistics Estonia separately offers table metadata and dimension-based statistical queries.

## Priorities for Maio

| Priority | Current state | Recommended change | Acceptance criteria |
| --- | --- | --- | --- |
| 1 | Catalog and source links exist; many licenses and source dates are unknown | Define dataset publisher, contact, license, themes, spatial/temporal coverage, update frequency and source modification time; expose a DCAT-AP JSON-LD catalog with distributions and a DataService | Validate against a chosen, documented DCAT-AP version; missing ownership and rights remain explicit rather than invented |
| 1 | Plans previously had no separate lifecycle field | Separate record lifecycle from collection availability; retain location evidence and uncertainty | Implemented for the three sports plans: lifecycleStatus=planned, source-linked coordinates, activity codes, explicit provisional location match. Other records without lifecycleStatus remain unspecified |
| 2 | OpenAPI 3.1, stable IDs, GeoJSON, bbox/search/pagination, CORS and ETags exist | Document controlled vocabularies and field definitions, including activity codes, lifecycle transitions, coordinate quality and timestamps | Machine-readable schemas with examples and compatibility tests; deprecation policy for breaking changes |
| 2 | Geographic routes resemble collection APIs but are not certified OGC endpoints | Evaluate an additive OGC API Features facade for GIS clients | Conformance tests pass before advertising compliance; retain existing /api/v1 clients |
| 2 | Dashboard datasets are returned as whole source payloads | Add dimension metadata and filters for period, island/municipality and indicator, with units and missing-value semantics | Queries reproduce known source totals and preserve source dates/revisions; Statistics Estonia's table API is a useful reference |
| 3 | Snapshot refresh is a manual sync and deployment | Assign owners and refresh schedules, publish freshness/quality reports and revision history | A source change produces a reproducible revision; stale data is distinguishable from zero observations |
| 3 | Errors use a small custom JSON envelope | Evaluate RFC 9457 problem details in a compatible version or negotiated response | Consistent documented error types, field validation details, no abrupt break for existing error.message consumers |

Before live sensors, define observed property, unit, observed time versus ingestion time, sensor identity, calibration/quality flags and location provenance. Do not mix readings into the static asset lifecycle model.

## Sports coordinate evidence

Coordinates are inherited from the existing Visit Maio / Maio Guide curated beach records and retain their geometry source IDs. They are approximate representative points, not a survey of future facilities. Bitche Rotcha: 15.140366, -23.215490; Ponta Preta: 15.126351, -23.203172. The requested Boa Lagoa is provisionally linked to the combined Boca Lagoa and Seada record at 15.127018, -23.142794, pending name confirmation. The local biodiversity foundation's beach guide describes Boca Lagoa near Barreiro; it does not establish an exact surf-break coordinate or confirm the requested spelling.

## Primary references

- [Estonia data-description standard 2.0 (2022)](https://www.stat.ee/sites/default/files/2022-06/AH_juhis_andmekirjeldus_standard_2.0.pdf)
- [RIA ATV mirroring API V2](https://abi.ria.ee/teabevarav/atv-mirroring-jobs-api-v2)
- [Statistics Estonia API manual](https://www.stat.ee/sites/default/files/2021-02/API-manual.pdf)
- [Fundação Maio Biodiversidade beach guide](https://fmb-maio.chewuaka.com/wp-content/uploads/2019/08/FMB_livretoMaio_compressed.pdf)

OGC and problem-details items are independent engineering recommendations, not claims about Estonian requirements. A follow-up implementation should check their current official specifications and validators.
