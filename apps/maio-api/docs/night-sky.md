# Maio Night Sky

The `/night-sky` page and `GET /api/v1/night-sky` provide a daily astronomical almanac for every day of any year from 2000 through 2100, including leap years. A Night Sky link appears in the explorer sidebar. This is a calculated domain, not a new sensor collection or copied observational dataset.

## Source and method

Astronomy Engine **2.1.19**, by Don Cross, is pinned in the app dependency lockfile. Primary source and method documentation:

- https://github.com/cosinekitty/astronomy
- https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md
- https://github.com/cosinekitty/astronomy/blob/master/LICENSE

The library is MIT licensed. Output identifies `dataKind: calculated-ephemeris`, the engine version, source link and assumptions. `/sources/astronomy-engine` describes this on-demand calculation. `sourceUpdatedAt` and `retrievedAt` are null because these are not retrieved observations. Original source record IDs are null; stable generated IDs encode observer coordinates and local date.

Default observer: latitude 15.25, longitude -23.15, assumed elevation 0 m. This is the existing Maio reference point, not a surveyed observing site. Optional coordinates are limited to the existing island bounding box; this is not an island-polygon containment test. Events use an unobstructed horizon and engine standard-atmosphere rise/set convention. Twilight is geometric solar-center altitude -6° (civil), -12° (nautical) and -18° (astronomical).

Local calendar boundaries assume Atlantic/Cape_Verde UTC−01:00 throughout the supported range. Responses return RFC 3339 UTC instants (`Z`) and explicit timezone/offset metadata; the page formats local times. A future timezone-rule change would require reviewing this assumption. Each evening's astronomical night ends the next morning, including December 31 → January 1.

Moon phase angle and illuminated fraction are geocentric values at 22:00 local. Phase angle is 0° new, 90° first quarter, 180° full and 270° last quarter. Illumination does not imply the Moon is above the horizon. `moonrise`/`moonset` may be null when no crossing occurs within that local date; no nearby day's event is substituted.

Clouds, dust, light pollution, terrain, star/planet visibility, meteor activity and observing-quality scores are **not** supplied. No all-year weather forecast is implied.

## Examples

- Full year: `/api/v1/night-sky?year=2026&limit=500`
- Leap year: `/api/v1/night-sky?year=2028&limit=500`
- One local date: `/api/v1/night-sky?date=2026-09-17`
- Custom observer: `/api/v1/night-sky?year=2026&latitude=15.2&longitude=-23.2&limit=100`

`year` defaults to the current Cape Verde year, or the supplied date's year. If both year and date are present they must agree. Latitude and longitude must be supplied together, with at most six decimals. Unknown or duplicate parameters, invalid dates and out-of-range coordinates return the existing 400 error envelope. `limit` defaults to 100, range 1–500, `offset` defaults to zero. Returned pagination links pin the year and preserve coordinates/date. Results are ordered by local date.

Calculation revision includes pinned engine/contract versions, year and observer coordinates. `X-Data-Revision` matches the response's calculation revision, independently of the geographic snapshot revision. ETags cover the exact response body; conditional GET/HEAD and public read-only CORS behavior remain supported. No request-time timestamp makes deterministic results unnecessarily uncacheable. Increment `contractVersion` for calculation-semantic changes.

## Verification

Regression tests cover full 365/366-day years, century leap-year handling, December 31 rollover, date-boundary validation, chronological twilight ordering, missing Moon events, fractional illumination bounds, stable IDs, filtering, pagination, deterministic revisions and 304 responses. OpenAPI 3.1 and a full leap-year response were validated against JSON Schema. These checks verify integration consistency, not independent observatory calibration.

## Constellations

`GET /api/v1/night-sky/constellations` adds all 88 constellation identities. The Night Sky page includes date, local time and observer-coordinate controls; it shows patterns with at least one source star above the geometric horizon.

Example: `/api/v1/night-sky/constellations?at=2026-09-17T23:00:00Z&aboveHorizon=true` (22:00 in Cabo Verde). `at` is required, with timezone and seconds; fractional seconds are limited to milliseconds. Local calendar years 2000–2100 are supported. Encode a positive timezone sign as `%2B`. Optional `latitude`/`longitude` use the same paired-coordinate validation as the almanac. `constellationId=ori` selects Orion; identifiers are lowercase IAU abbreviations. `aboveHorizon=true` means at least one pattern vertex is above altitude 0°, `false` means none, and omission returns all 88. Standard limit/offset pagination is in stable ID order and preserves the specified instant and filters.

### Source integration

Source: [d3-celestial](https://github.com/ofrohn/d3-celestial/tree/7e720a3de062059d4c5400a379146a601d9010e0), Olaf Frohn, pinned commit `7e720a3de062059d4c5400a379146a601d9010e0`. Its [readme](https://github.com/ofrohn/d3-celestial/blob/7e720a3de062059d4c5400a379146a601d9010e0/readme.md) identifies J2000 equatorial coordinates and IAU chart credits. Distribution terms are BSD-3-Clause; the original license, readme, names and line-pattern files are retained verbatim in `data/astronomy/`. SHA-256 hashes, actual retrieval time and pinned commit are recorded in `data/constellation-catalog.json` and source discovery. No original source publication date is inferred.

Run `node apps/maio-api/scripts/import-constellations.mjs <reviewed-full-commit-hash>` to import a reviewed revision, then sync the data snapshot and test. The importer fetches and validates all files before writing. It converts wrapped RA degrees to hours, retains declination, groups the two Serpens entries into one constellation with two label/reference points, and deduplicates the pattern's coordinate vertices. Latin names are used; the multilingual translation fields are not used in API records. Source feature-index pointers remain on each record.

### Calculation meaning

Astronomy Engine rotates each J2000 direction into the observer's horizon frame, including precession, nutation and Earth rotation. Stellar proper motion and atmospheric refraction are not modeled. Direction and altitude are for the catalogue's **label/reference points**, not geometric constellation centres or a particular star. RA/declination are celestial coordinates, not WGS84 GeoJSON: they are returned in explicitly named fields. Only the observer location is geographic GeoJSON.

The `pattern` object counts sourced star-pattern vertices above the horizon and returns minimum/maximum altitude plus `below-horizon`, `some-pattern-stars-above` or `all-pattern-stars-above`. This is not the extent of the official IAU boundary, and it does not mean all stars belonging to the constellation are visible. A reference point may be below the horizon when other pattern stars are above it. Azimuth is clockwise from north; compass direction and azimuth are null at zenith/nadir. Solar altitude and `isAstronomicalDarkness` (Sun centre below −18°) give daylight/twilight context without promising visual detectability.

Catalogue and calculation provenance are linked separately. Retrieval time refers to the pinned catalogue, not a fresh observation. Calculation revisions include source checksums, engine/contract versions, normalized instant and observer position. Equivalent instants expressed in different timezones produce the same geometry and revision. ETags, HEAD/304, CORS and the existing error envelope remain supported.

Added schemas: `ConstellationReferencePoint`, `ConstellationPattern`, `ConstellationPosition`, `ConstellationPage`. No geographic collection or observational dataset is fabricated. Existing endpoints remain compatible. The source classification gains `reference-catalog`, and Night Sky discovery links now include constellations.

Integration tests verify upstream hashes, preserved positions, 88 distinct IDs including Serpens, geometric altitude against a separate spherical-trigonometry formula, daylight/night context, filters, pagination, timezone equivalence, invalid inputs, provenance and conditional requests. Calculations have not been independently calibrated against an observatory. Live cloud/visibility forecasts and official-boundary visibility remain outside this implementation.

## Canonical astronomy domain

Use `/api/v1/astronomy` as the discovery entry point. The existing `/api/v1/night-sky` and `/api/v1/night-sky/constellations` contracts remain compatible. This change does not deploy or connect any new upstream source.

| Endpoint | Status | Meaning |
| --- | --- | --- |
| `/astronomy` | available | Capabilities, timezone, supported years and links |
| `/astronomy/sky?date=2026-12-15&time=22:00` | available | Sun/Moon geometric positions, Moon phase at the requested time, local-day solar events and constellation patterns |
| `/astronomy/constellations?year=2026&month=12&time=22:00` | available | One snapshot per calendar day at 22:00 local; December returns 31 daily records |
| `/astronomy/moon?date=2026-12-15&time=22:00` | available | Phase/illumination and horizon position at that instant, plus rise/set during the local date |
| `/astronomy/almanac?year=2026&limit=500` | available | Existing full-year Sun/Moon almanac under the canonical domain |
| `/astronomy/meteor-showers` | planned | Empty records; no reviewed catalogue or year-specific predictions connected |
| `/astronomy/dark-sky-spots` | planned | Empty records; no verified observing-site inventory, darkness assessment or access information connected |
| `/astronomy/stargazing-score` | planned | `score`, `scale` and `methodology` are null; missing inputs are declared |

All table paths are relative to `/api/v1`. `date` and `time` use Cape Verde local time (UTC−01:00); `at` in responses is an explicit UTC instant. Default time is **22:00**, returned in the payload and pinned in pagination links. Moon phase in the new sky/moon routes is evaluated at the requested time, unlike the original daily almanac's fixed 22:00 value.

Constellation queries accept **month plus optional year**, or **date**, never both forms together. If year is omitted, the current Cape Verde year is returned and pinned in subsequent links. Pagination counts **days**, not individual constellations. Each day includes solar altitude, astronomical-darkness context and the matching constellation array; daily results are not continuous visibility guarantees for the month. Optional `aboveHorizon` defaults to true; false selects patterns with no source vertices above the horizon. `constellationId` selects a lowercase abbreviation. Both filters retain the original pattern-based semantics. Unknown valid constellation IDs produce daily records with empty constellation arrays.

Sky and moon require a date. Planned score optionally accepts date/time/location for context but never derives a score from astronomical darkness alone or from stale environmental snapshots. Meteor-shower discovery accepts optional year/month filters; dark-sky-spot discovery currently accepts pagination only. Unsupported/duplicate parameters return the existing 400 envelope even for empty planned feeds.

Optional latitude/longitude are supported on calculated sky, moon and constellation resources, and on the almanac. Both must be supplied together and within the established Maio bounding box, with at most six decimal places. The box includes offshore positions and is not a surveyed site boundary.

Every astronomy response has its own capability/calculation revision, matching `X-Data-Revision`. ETags cover the exact body. Read-only methods, CORS, HEAD and conditional GET/304 remain supported. No new geographic collections or observational datasets are created by this restructuring. API and source catalog links advertise the primary astronomy domain, while the previous night-sky domain entry remains an explicit alias.

Implementation: `lib/astronomy.mjs`, `lib/openapi-astronomy.mjs`, `lib/api.mjs`, `lib/interoperability.mjs`, `lib/openapi.mjs`, API route revision handling, and the Night Sky page's API links. Shared constellation calculation version is exported to keep monthly revisions tied to the underlying model. New reusable schemas include AstronomyDomain/Capability, AstronomySky, AstronomyMoon/Response, AstronomyBodyPosition, AstronomySolarEvents, AstronomyConstellationDay/Page, PlannedAstronomyPage and StargazingScore. Regression checks are in `tests/astronomy.test.mjs`.

## Stargazing sky-map geometry

`GET /api/v1/astronomy/sky-map?at=2026-09-17T23:00:00Z&latitude=15.25&longitude=-23.15` serves the standalone `apps/stargazing` client. This additive endpoint accepts a RFC 3339 instant (UTC years 2000–2100), latitude −90…90 and longitude −180…180, up to six decimals. Coordinates must be paired; omission defaults to Maio. Existing island-restricted endpoints retain their contracts.

The response includes all 88 constellation identities, horizon-coordinate line `paths`, label `center`, `highest` pattern vertex, `count` of unique pattern stars, `above` horizon flag, and `sunAltitude`. Each point uses `az` clockwise from north and `alt` above the geometric horizon, in degrees. At zenith/nadir azimuth is an arbitrary rendering convention. Both Serpens parts are retained. Pattern stars have no magnitude field. No pagination/filtering is needed for this fixed-size map response.

Catalogue revision/source metadata and existing observation caveats accompany the geometry. Calculations use the same pinned Astronomy Engine and d3-celestial data as the existing endpoints. Stable revision, ETag, HEAD, OPTIONS and public read-only behavior are inherited from the API router. The app fetches via a same-origin proxy and retains only projection/orientation math locally. Deploy this API change before the stargazing client; it does not silently fall back to copied catalogue data.
