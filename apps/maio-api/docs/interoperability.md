# Core design principle and implementation review

Maio Open API is an interoperability layer, not a new authority or an isolated database:

**Authoritative source → Maio interoperability layer → applications.**

Snapshot files are reproducible delivery artifacts. They retain origin, source identifiers, valid/reference times, retrieval times, source limitations and reuse terms. Materialization supports reproducible reads, pagination and availability; it must not erase upstream provenance or imply real-time freshness.

## Assessment

The earlier implementation already preserved stable IDs, source manifests, original attributes and payloads, checksums, explicit empty/planned states, versioned read-only routes, WGS84/GeoJSON, ETags and pagination. However, application consumers had limited navigable discovery of source origin and transformation/refresh policies. Some imported files still have no upstream publication URL. All refreshes are manual. A source label alone does not establish authoritative provenance.

This review adds:

- `/api/v1/catalog`: a combined, linked discovery catalog for collections, datasets and source contracts.
- `/api/v1/sources/{sourceId}`: source origin, classification, provenance status, refresh method, transformation description and links to dependent data.
- `sourceId` filtering on feature lists, including collection/place feature lists, so source pages link to inspectable data rather than opaque names.
- Additive dataset links to source contracts and normalized records; source catalog entries also link to their dependent collections and datasets.
- Source contracts in the generated snapshot and its revision: upstream URLs already present in the source metadata, licensing, manual refresh methods, retrieval/source timestamps and explicit `freshnessAssessment: not-assessed`.

No missing publication URL, publisher endorsement, refresh schedule or source date is invented. Dataset source links are extracted only from existing metadata. Community maps, model providers, editorial sources, secondary extracts and reviewed official imports have distinct classifications. A linked URL means linked-source, not independently verified authority. Population and first-pass budget extracts remain needs-review. Source implementations/commands are repository-relative documentation for maintainers, not executable remote API actions.

## Consumption pattern

1. Start at `/api/v1/catalog` or the API root.
2. Inspect collection/dataset availability and source IDs.
3. Follow the source contract. Check provenanceStatus, license, upstreamUrls, source/reference/retrieval times and transformation notes.
4. Fetch data through its linked resource, retaining record sourceId/sourceRecordId and caveats in the application.
5. Follow pagination links; restart an export if revision changes. ETag validation establishes cached-content identity, not source freshness.

Consumers must not rank all available data as equally authoritative. A population record marked needs_review is not an authenticated census result. Model weather estimates are not readings from municipal sensor hardware. Missing source links and dates are visible coverage gaps.

## Work still needed

- Obtain verified INE/RGPH publications and geographic code crosswalks. Importers exist; the INE import registry remains empty.
- Review original population and budget publications; replace or annotate secondary extraction records with verified provenance without silently merging conflicting series.
- Establish per-source owners, approved refresh cadence, freshness thresholds, failure monitoring and revision/history retention. Current refresh is manual; no scheduler was installed.
- Migrate Visit Maio, Guide and dashboard consumers through tested adapters. Their original data loading has not been replaced by this task.
- Add genuine transport operations feeds and physical sensor registries when reliable sources exist.
- Select and validate a DCAT-AP profile/OGC conformance facade if external catalog/GIS federation requires it. The current JSON catalog does not claim that conformance.

## Compatibility

Existing endpoints, payload fields, stable IDs and anonymous read-only access remain. Source and dataset descriptions gain fields and links; clients should allow additive metadata. Unknown source detail IDs return 404; unknown sourceId filters return empty feature lists. Checksums on original legacy dataset payloads remain unchanged. The overall snapshot revision and response ETags change because source contracts are now part of the artifact. No source systems are modified and no existing application is forced to migrate.

This review adds no collections, datasets or source connections. It makes the current ones discoverable and inspectable. Earlier user-approved removal of 37 unnamed beach records is a separate compatibility change: those IDs no longer resolve. Hidden sidebar collections remain available through the API.

## Public contract guarantees

OpenAPI remains 3.1.0. Successful responses reference reusable component schemas; errors use the same `Error` envelope for 400, 404, 405 and 500. Conditional GET/HEAD supports strong, weak, list and wildcard `If-None-Match` validators; 304 responses have no body and retain ETag/revision headers. Error responses use `no-store`.

Paginated resources default to limit 100, accept 1–500, and use nonnegative offsets. Follow returned links to preserve filters. Pagination is stable within a snapshot revision, not across refreshes; restart paging if `X-Data-Revision` changes. Supported filters combine with AND; list endpoints reject unknown or repeated query parameters. Existing catalog/detail parameter behavior is retained for backwards compatibility. Unknown collection/place selectors may return 404; unknown source or environmental filter values return empty matches, as documented per endpoint.

Public IDs are stable URL-safe identifiers, independent of names. Original upstream identifiers remain separate. GeoJSON uses WGS84 longitude/latitude, typed coordinate nesting and closed polygon rings; unavailable geometry is null. Source dates are ISO 8601 calendar dates or RFC 3339 instants, or null when unknown. Source dates are not replaced by request times.

Null is never interpreted as zero. Planned dataset payloads are null; catalogs omit payloads intentionally. Missing environmental measurements are omitted, while normalized statistical records may carry null with a valueStatus indicating missing/suppressed/not-applicable. Existing legacy payloads remain source-native. Transformations retain source IDs and source record IDs; sources expose attribution, licensing, timestamps and transformation details.

Regression checks in `tests/contracts.test.mjs` cover schema references, errors, pagination/filter preservation, conditional requests, IDs, polygon closure and attribution links. Full OpenAPI and JSON Schema validation was also run against every published feature, place, dataset, observation, source contract and normalized record.

### Road classification correction (2026-09-17)

The transport importer previously treated `highway=bus_stop` as a road. These 26 existing point records now belong to `transport`, preserving their IDs, attributes, geometry and source attribution. Roads contains 513 LineString segments rather than 539 mixed records; transport contains 28 records. Collection counts and membership change intentionally; feature detail URLs remain valid. This is a classification correction, not a refresh of OSM geometry. The root and Guide transport files are identical snapshots dated 2026-01-28. The explorer highlights only the current result page over a background of roads and trails; neither the count nor that preview represents a count of named roads or certified current road coverage.

Roads publication is temporarily withdrawn at the user's request. The explorer hides the collection and removes roads from its background. Roads list endpoints return empty results with `status: planned`, `publicationStatus: withdrawn` and an explanation; general feature listings exclude withdrawn roads. Collection metadata has count zero. Existing detail IDs remain accessible, explicitly marked withdrawn, to preserve saved links and source provenance. The original source files and retained snapshot records are not deleted. This overrides the earlier classification correction's published road count until review is complete.
