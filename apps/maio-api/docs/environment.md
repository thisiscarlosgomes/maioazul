# Environmental observations and sensors (local, not deployed)

The existing Maio app integrates Open-Meteo weather, marine and air-quality APIs at the representative request location 15.25 N, 23.15 W. This extension uses those same providers directly so their valid times, units and grid coordinates are preserved. These are **model estimates**, not measurements from a registered physical sensor. No sensor objects are invented.

## Endpoints under /api/v1

- `GET /observations`: paginated sourced environmental records.
- `GET /observations/{observationId}`: a stable source/variable/valid-time identity for the fixed Maio request location.
- `GET /sensors`: registered physical sensors; currently empty and explicitly planned.
- `GET /sensors/{sensorId}`: unknown/unregistered IDs return 404.
- `GET /observation-parameters`: parameter descriptions, conventional units and available/planned status.

Both list endpoints accept `featureId`, `sensorId`, `parameter`, `from`, `to`, `bbox`, `limit`, `offset`. Time boundaries are inclusive RFC 3339 timestamps with timezone; malformed dates and inverted ranges return 400. Sensor time filters select sensors with matching observations in that interval, rather than comparing installation dates. Bbox is west,south,east,north in WGS84; it filters the record's point geometry. Filters combine with AND. Unknown filter IDs match no records; unknown detail IDs return 404. Lists use stable ID ordering, counts and pagination links. Existing CORS, ETags, HEAD, OPTIONS and read-only methods apply.

The existing `/collections/observations/items` now exposes GeoJSON representations of the same records. Their attributes.observationId resolves through the observation endpoint. The original assets, dataset payloads and sensor placeholder collection remain intact. `featureId:null` means no surveyed asset is linked; a provider grid point is not assigned to a beach or locality.

## Available source coverage

The saved source response contains weather temperature, rainfall, total precipitation, humidity, wind speed, wind direction and surface pressure; marine sea temperature, significant wave height and wave period; air PM2.5, PM10, carbon monoxide, nitrogen dioxide and ozone. Only numeric, non-null values actually returned by the provider are imported. No interpolation or synthetic zeros are used.

Tide/water level, currents, water-flow/water-quality and energy parameters have discovery definitions but remain planned. The extended measurementContext schema allows vertical datum, sensor height/depth, direction convention, aggregation and period boundaries when those values are supplied by a future source. Tide levels and current directions must not be compared without their datum/depth/convention.

Observations retain the existing observedAt/parameter/value/unit/sourceId/featureId contract. `observationKind` distinguishes measured values, model estimates and forecasts. For these provider current-condition estimates, `observedAt` and `validAt` are the upstream model valid time; neither is a claimed physical measurement time. `retrievedAt` is the actual fetch time, `updatedAt` remains null because the model issue/update time is not supplied. `intervalSeconds` comes from the provider. Rainfall is distinct from total precipitation. Provider grid coordinates may differ between domains and from the requested point.

Source manifests include provider URL, documentation, attribution, retrieval time, payload checksum and CC-BY-4.0 licensing. The public record caveat and explorer label explicitly identify model estimates. Physical sensor contracts include source IDs, parameter capabilities, operational status, geometry and optional calibration metadata; no physical sensor is currently registered.

## Refresh and reproducibility

```sh
npm --workspace apps/maio-api run data:refresh-environment
npm --workspace apps/maio-api run data:sync
npm --workspace apps/maio-api test
npm --workspace apps/maio-api run build
```

Refresh saves the raw upstream responses to `data/environment-source.json` atomically, only after every provider succeeds and normalization validates. A failed request or malformed response leaves the previous file unchanged. Missing individual values are omitted. Refresh replaces the current snapshot, not a history archive; no recurring refresh is configured. Ordinary API requests never fetch upstream. Sync is deterministic from the saved responses and includes observations in the revision hash. These commands do not deploy.

This snapshot will become stale: clients must inspect validAt and retrievedAt rather than treating an HTTP 200 or a fresh ETag check as a current observation. No live sensor coverage is asserted.

Primary provider documentation: [weather](https://open-meteo.com/en/docs), [marine](https://open-meteo.com/en/docs/marine-weather-api), [air quality](https://open-meteo.com/en/docs/air-quality-api).
