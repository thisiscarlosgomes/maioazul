# INE Cabo Verde / RGPH import architecture

This is preparation for future authoritative source files. No census figures or boundaries were downloaded, scraped, inferred or published. The `data/ine/imports.json` registry is empty. Existing database-backed population routes and narrative census mentions are not a verified RGPH import integration.

## Workflow

1. Obtain an official published **aggregate** table or geographic file and its INE publication metadata. Review the publication URL, edition, reference period, definitions, reuse terms and transcription against the source. The importer checks the INE hostname and a review declaration; it cannot establish authenticity from a URL alone.
2. Convert the approved extract to typed JSON. Use `adaptStatisticalTable` to explicitly map source columns and dimensions. Use `adaptGeographicFile` for a GeoJSON FeatureCollection with explicit field mappings. No CSV locale guessing, spreadsheet formula evaluation, PDF scraping or automatic CRS detection occurs.
3. Prepare a package with `source`, `crosswalk`, `statistics` and `geography`. Only those allowlisted fields are accepted. Never include person/household microdata or arbitrary extra source columns.
4. Validate without changing any application data:

```sh
npm --workspace apps/maio-api run data:import-ine -- /absolute/path/to/reviewed-package.json
```

5. Register the verified package locally, then regenerate and test the snapshot:

```sh
npm --workspace apps/maio-api run data:import-ine -- /absolute/path/to/reviewed-package.json --apply
npm --workspace apps/maio-api run data:sync
npm --workspace apps/maio-api test
npm --workspace apps/maio-api run build
```

These commands never deploy. Imports are serialized operations; run one importer at a time. A complete file is written before the atomic registry update. A failure before registration may leave an unreferenced file, but sync will not consume it. The CLI refuses to overwrite an already registered source edition. To withdraw or replace an edition, explicitly review the registry change, regenerate, and check affected IDs. Do not register a correction alongside the superseded edition and then sum both.

## Package contract

`source`: stable `id` beginning `ine-`; `title`; HTTPS INE publication `url`; `publisher: "INE Cabo Verde"`; `license` (use `Not specified by source` when unknown); nullable `licenseUrl`, `updatedAt`, `retrievedAt`; explicit `referencePeriod`; `dataClass: "aggregate"`; `review: {status: "verified", reviewedAt: <actual review date>}`. Publication years are not substituted for retrieval or update dates. Unknown dates remain null.

`crosswalk`: array of `{code, level, geographicScope, locality, placeId, evidence}`. Codes are strings and preserve leading zeroes. Supported levels: island, municipality, parish, locality, statistical-area. Review which official codes belong to Maio before ingestion; the importer does not invent official codes. `placeId` is an existing stable Place ID or null. Only locality-level codes may map to locality Places. Names/proximity are not used for matching. `evidence` records the basis of each code association. Unmatched localities may be imported with placeId=null and linked later after a separate registry review.

`statistics`: array with required fields:

- `sourceRecordId`: stable source row/cell identity, including dimension identity where the source does not have a row key. Never use a transient sorted row number.
- `datasetId`: population, households, housing, employment, education or demographic-indicators.
- `geographicCode`: exact crosswalk key.
- `year`, `referencePeriod`, `indicator`, `unit`: explicit source semantics, never guessed from column names.
- `value`, `valueStatus`: reported finite number (including a real zero), or null for missing/suppressed/not-applicable. No suppression marker is coerced to zero.
- `dimensions`: mapping from dimension names to source string labels/codes, e.g. age, sex or activity classification. Preserve totals and subgroups distinctly; import performs no aggregation.
- `caveats`: source notes and transcription/coverage limitations.

Population by locality uses the population dataset with locality-level geographicCode/placeId, not a duplicate dataset. Demographic indicators receive a dataset entry only when actual records are imported. Other existing planned datasets activate only when valid rows are present. Municipality/island totals are never allocated to localities. Current record endpoint filters remain available; dimension filtering is not implemented, so clients must inspect dimensions before combining rows.

`geography`: array of `{sourceRecordId, geographicCode, collection, name, crs, geometry, caveats}`. Collection is admin-boundaries or localities. CRS must explicitly be `OGC:CRS84` (WGS84 longitude/latitude). Localities accept Point/Polygon/MultiPolygon; boundaries accept Polygon/MultiPolygon. Coordinates must fall within the existing Maio import extent. Points/rings, ring closure and coordinate ranges are validated. Complex topology and reprojection need a reviewed GIS preprocessing step; this importer does not certify topology or infer legal boundaries.

## Publication and provenance

Sync revalidates every indexed package before producing output. Feature and statistical IDs derive from the pinned source edition and sourceRecordId, not value/name/order. Source checksums, publisher, publication URL, timestamps and license are retained. Import normalization uses an allowlist and preserves source codes, dimensions and source values. Repeated IDs or unmapped geographic codes fail closed.

New official locality features link to existing Places only through the reviewed crosswalk, without replacing their IDs or representative geometry. Official boundaries remain distinct source features; they never silently replace existing zoning or editorial geography. Unlinked new localities still appear in the localities collection for later curation. Imported official records are classified by provenance; OSM/editorial records are not relabeled as authoritative INE records.

The public API remains anonymous, read-only and snapshot-based. Only the local import workflow writes files. Revision tracking and ETags automatically cover imported data and metadata. Tests use explicitly synthetic fixtures outside the import registry; none is part of the public snapshot.
