# Maio Open API

A standalone Next.js app in `apps/maio-api`: a public read-only API and browser explorer for the shared digital representation of Maio. Runs without credentials, MongoDB or external APIs. The explorer consumes the same API available to other clients.

## Run

From the repository root (Node 20.9+):

```sh
npm install
npm run dev:api
# http://localhost:3004
```

Production:

```sh
npm run build:api
npm run start:api
```

Validation and source refresh:

```sh
npm run test:api
npm --workspace apps/maio-api run typecheck
npm run sync:api
npm run build:api
```

The checked-in `data/snapshot.json` is the deployable data artifact. `sync:api` reads an explicit list of source files from the repository, normalizes records, and deterministically regenerates it. Refreshing the file requires a rebuild/redeployment; this release does **not** watch source files or query production databases. Nothing writes to the source applications.

## API V1.1 (compatible /api/v1)

All URLs below are relative to the API origin. Public GET/HEAD requests require no key. OPTIONS supports cross-origin clients. Mutations return 405 with CORS headers. Successful responses carry a content ETag and `X-Data-Revision`; conditional GET supports 304. Errors return `{ "error": { "status": 400, "message": "…" } }` and are not cached.

| Endpoint                         | Purpose                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `/api/v1`                        | Discovery and links                                              |
| `/api/v1/health`                 | Snapshot readiness and counts                                    |
| `/api/v1/collections`            | Collection catalog, counts and coverage status                   |
| `/api/v1/collections/{id}`       | One collection's metadata                                        |
| `/api/v1/collections/{id}/items` | Paginated GeoJSON                                                |
| `/api/v1/features`               | Search across all collections                                    |
| `/api/v1/features/{id}`          | Single GeoJSON feature                                           |
| `/api/v1/datasets`               | Dashboard dataset catalog, without payloads                      |
| `/api/v1/datasets/{id}`          | Full original dataset with source metadata                       |
| `/api/v1/sources`                | Geographic/editorial source files, attribution, dates and hashes |
| `/api/v1/openapi.json`           | OpenAPI 3.1 contract                                             |

Feature-list filters:

- `collection`: a single collection ID (on `/features`).
- `q`: case- and accent-insensitive search over source attributes, at most 200 characters.
- `bbox`: `west,south,east,north` in WGS84 longitude/latitude order. Uses **bounding-box overlap**, not exact geometry intersection. West must be less than east; no antimeridian wrapping. Records with missing geometry are excluded.
- `geometry`: `available` or `missing`.
- `limit`: 1–500, default 100.
- `offset`: zero-based integer, default 0. Results are sorted by stable feature ID.

Follow `links.next` until null for a complete collection export. Counts refer to the filtered result before pagination. Unknown or duplicate feature-list parameters are rejected. Empty collections and searches return 200 with an empty FeatureCollection. Unknown IDs return 404.

```sh
curl 'http://localhost:3004/api/v1/collections/beaches/items?limit=10'
curl 'http://localhost:3004/api/v1/features?collection=businesses&q=ingles'
curl 'http://localhost:3004/api/v1/features?bbox=-23.25,15.10,-23.10,15.25'
curl 'http://localhost:3004/api/v1/datasets/energy'
```

Example for Visit Maio, Guide, the Data Portal or another client:

```js
const apiOrigin = "http://localhost:3004"; // replace with the deployed origin
let next = "/api/v1/collections/beaches/items?limit=500";
const features = [];
while (next) {
  const response = await fetch(new URL(next, apiOrigin));
  if (!response.ok) throw new Error(`Maio API: ${response.status}`);
  const page = await response.json();
  features.push(...page.features);
  next = page.links.next;
}
```

Clients should cache by ETag and restart a paginated export if `revision` changes between pages. Existing apps are not yet migrated to consume this API; their data formats differ, so adopt via an adapter rather than changing their fetch URLs alone.

## Data and provenance

Current snapshot: 5,370 geographic source records (including 15 model estimates) across 25 collections (19 populated), plus 20 dataset definitions (8 with source data, 12 planned). Collection memberships overlap, so collection counts should not be summed as a unique-asset total.

- Repository map layers: roads, trails, beaches, protected areas, hydrology, natural features, settlements, zoning and categorized OSM places.
- Visit Maio's 85 curated geographic/editorial place records, merged by ID with Guide's 84-record edition (87 combined curated IDs). Guide's fields and valid coordinates take precedence for shared IDs; root-only records remain available. `preferredSourceId` and `geometrySourceId` make that choice explicit. Guide settlement enrichments likewise take precedence for shared OSM IDs.
- Maio Guide's field-surveyed 2026 off-road route (12 segments), and its experience directory, exposing only explicit editorial fields. Experience listings without coordinates remain unmapped tourism assets, not inferred sports infrastructure.
- Dashboard source files: energy, tourism 2025, tourism 2026 Q1–Q2, transport 2025, payment infrastructure and external-sector statistics. National datasets are labeled as such; original units, periods, notes and discrepancies are retained.
- Private bookings, payments, registrations, admin data and database collections are never read. The separate demo accommodation file with placeholder-style contacts is not imported.

The importer deduplicates matching OSM IDs across layers (`osm-way-…`, `osm-node-…`, `osm-relation-…`) and merges collection memberships/source IDs. On overlapping OSM records, the first declared layer's geometry and attributes take precedence, except the explicitly preferred Guide settlement edition. Curated IDs are source-namespaced; records without a source ID receive a deterministic content-derived ID (which can change if their name/geometry changes). Semantic duplicates between curated assets and OSM are **not** automatically conflated. These are source-record counts, not a verified census of distinct physical assets.

Records outside the configured Maio envelope `[-23.30,15.05,-23.02,15.40]` are excluded by envelope overlap (not polygon clipping). Missing/empty geometry becomes GeoJSON `geometry: null`; no coordinates are invented. This snapshot has 23 unmapped records and excludes two out-of-extent source records. Source timestamps remain null when unknown. The revision hashes normalized features, collection definitions and source checksums; it is not an observation timestamp.

OSM records retain ODbL attribution and obligations; editorial enrichments can have separate rights. Other source licenses are unspecified and are not automatically relicensed by exposing the API. Consult per-source metadata and original dataset notes before redistribution. The manifest preserves original source file paths so records can be audited.

## Coverage and future ingestion

Water points currently have `no-records` status. Sports contains three editorial plans with `properties.lifecycleStatus: "planned"`: Bitche Rotcha, Ponta Preta and a provisional Boa Lagoa → Boca Lagoa match awaiting name confirmation. Coordinates are representative beach points, not surveyed facilities. Activity codes and location caveats are retained in `attributes`. Collection `status: "available"` means records are queryable, not that a facility is operating. For water points, this means the current imported data does not explicitly identify those facilities, not that Maio has none. Hydrology is not treated as potable-water availability. Physical sensors remain `planned`. Environmental observations include source-backed model estimates, clearly labeled as snapshots rather than physical sensor readings.

`Observation` in the OpenAPI schema is a **future contract**, not an implemented write endpoint. It defines IDs, feature/sensor references, source, observed timestamp, parameter, value, units and quality. A subsequent ingestion service can validate authorized feeds and publish public readings through these collections. Keep ingestion authenticated and separate from this public read surface.

For a growing authoritative store, move normalized assets to a spatial database (for example PostgreSQL/PostGIS), retain these public IDs/contracts, store source versions and stewardship history, and add observation storage with indexed timestamps. Exact geographic intersection, proximity/routing, live transport schedules, realtime weather/sensor ingestion, write/contribution workflows and automatic sync are outside this snapshot release.

## Deploy as a standalone app

Create a separate Next.js deployment with root directory `apps/maio-api`. The committed snapshot is imported into the server build, so deployed runtime access to the parent repo is unnecessary. Build with `npm run build`; start with `npm run start` when self-hosting. For monorepo package installation, use the repository root workspace install. No environment variables are required. The UI may load Google Fonts; the API and map do not depend on external map tiles.

Refresh the snapshot in the full repository before deployment when upstream data changes. Do not run the sync script from an isolated deployment checkout without its source files. Production: https://maio-open-data.vercel.app (Vercel project `maio-open-data`, scope `forkctokcs-projects`).

Public caching, bounded page sizes and strict feature query validation are built in. For an internet-facing deployment, apply shared platform rate limits appropriate to expected traffic; there is no misleading per-process quota in the app. The snapshot architecture is intentionally suitable for this initial dataset size, with text search scanning the in-memory snapshot.

## Production operations

This app is deployed independently from its own directory, with no automatic Git deployment connection. The parent repository is linked to a different Vercel project; do not deploy from the repository root for this app.

```sh
cd apps/maio-api
npm ci --workspaces=false
npm run build
npx vercel@59.19.0 link --project maio-open-data --scope forkctokcs-projects --yes
npx vercel@59.19.0 deploy --prod --archive=tgz --scope forkctokcs-projects --yes
node scripts/smoke-test.mjs https://maio-open-data.vercel.app
```

The app-level lockfile pins the independent production install. Next.js 16.3.5 and React 19.3.0 were selected during deployment after the original framework versions reported security vulnerabilities. The isolated dependency audit reported zero known vulnerabilities. Compressed uploads avoid sending the large GeoJSON snapshot uncompressed. Local Vercel credentials and environment files are ignored by Git and deployment uploads.

## V1.1 additions

See [V1.1 contracts, provenance and migration notes](docs/v1.1.md). New routes under `/api/v1`:

- `/places`, `/places/{placeId}`, and its `/features`, `/infrastructure`, `/datasets` links.
- `/datasets/{datasetId}/records` for filtered normalized indicators.
- `/transport` and its `/routes`, `/schedules`, `/arrivals`, `/departures` capabilities (planned).

All original routes remain available. Planned entries are explicitly labeled in the explorer and excluded from its available-dataset count.

## Environmental observations and sensors

See [environmental contracts and refresh workflow](docs/environment.md). This extension is local only and has not been deployed.

Beach features include `properties.displayName` (a human-friendly string) and `properties.nameStatus` (`sourced` or `missing`). The original `name` string/translation object/null is preserved. Display names prefer Portuguese, then English. Unnamed beach records are excluded during import under the editorial publication policy. This removes 37 previously published IDs from the local snapshot; their detail endpoints return 404 after this change is deployed. Shared source files remain intact.

## Future INE / RGPH ingestion

[INE ingestion architecture](docs/ine-ingestion.md) describes typed table/GeoJSON adapters, verified publication metadata, geographic-code crosswalks, suppression handling, validation-only imports and explicit local registration. The import registry is empty: no INE figures or boundaries were added by this architecture work.

Population now includes the existing dashboard Maio island record, with `quality: needs_review`. Its INE attribution and stored year lack an original publication/table reference; it is not labeled as RGPH 2021. Query `/api/v1/datasets/population/records`. Source publication time stays null; the database update time is separate. No locality totals are inferred.

## Core design principle

**Authoritative source → Maio interoperability layer → applications.** This API serves reproducible source-backed snapshots, not a replacement system of record. Begin with `/api/v1/catalog`, then inspect `/api/v1/sources/{sourceId}` for origin links, provenance status, licensing, transformations and manual refresh policy. Feature lists accept `sourceId`. See [the interoperability review](docs/interoperability.md) for implementation details, limitations and the consumer migration roadmap.

## Night Sky

Year-round calculated Sun/Moon almanac: `/night-sky` and `GET /api/v1/night-sky?year=2026&limit=500`. Supports 2000–2100, optional observer coordinates, source attribution and conditional requests. See [night-sky.md](docs/night-sky.md) for methodology, limitations and examples. This is calculated astronomy, not observed visibility or weather.

Constellations: `GET /api/v1/night-sky/constellations?at=2026-09-17T23:00:00Z&aboveHorizon=true`. All 88 constellation identities, sourced star-pattern horizon status and reference-point direction/altitude. Catalogue: pinned d3-celestial (BSD-3-Clause); calculations: Astronomy Engine. Details and limitations are documented in [night-sky.md](docs/night-sky.md).

The canonical domain is now `/api/v1/astronomy`: `sky`, `constellations`, `moon` and `almanac` are available; `meteor-showers`, `dark-sky-spots` and `stargazing-score` explicitly remain planned. For example, `/api/v1/astronomy/sky?date=2026-12-15&time=22:00` or `/api/v1/astronomy/constellations?year=2026&month=12`. Existing `/night-sky` routes remain compatible. See [the domain contract](docs/night-sky.md#canonical-astronomy-domain).
