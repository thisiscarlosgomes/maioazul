# MCP 0.4 update

The MCP server and `/mcp-guide` now derive their tool lists from `nativeToolDefinitions`. Five additive read-only tools query the production Maio Open API directly: `get_open_data_catalog`, `get_open_data_collection`, `get_open_data_feature`, `get_open_data_dataset`, and `get_open_data_source`. Total: 29 tools. The upstream origin is fixed; IDs and filters are validated, pages are bounded, and provenance/caveats are preserved. No local copy of the API dataset is created. Dataset metadata omits the bulky payload and records; normalized records retain pagination. Existing MCP tool names are unchanged.

## Schedule corrections

- CV Interilhas: only rows on the explicitly selected source date are returned. Full dates come from the source date-picker input and must match its day heading. No extrapolation, invented sailings, or unsupported vessel/arrival values. Other dates require a future adapter; an empty selected day is not a claim about all service.
- FlightMapper: only explicit weekday rows with a valid source end date covering today are returned; future-only, expired and undated rows are excluded. This is a third-party timetable, not live operational data. Unverified local Aviationstack cache files are no longer consumed.
- `updated_at` and `sourceUpdatedAt` are null when source publication time is unknown. `retrievedAt` identifies fetch time. Responses are not cached. Upstream failures produce explicit unavailable states (503 if all required fetches fail), never substitute trips.
- Root app schedule offline snapshots and service-worker fallback are disabled. Existing consumers must handle null timestamps/arrival/vessel, ISO dates, empty results and 503 responses. These are intentional data-quality corrections; route names and outer schedule containers are retained.

The existing `/api/v1/transport/*` operational endpoints on api.maio.cv remain planned. This change improves the main site's schedule routes and MCP; it does not automatically deploy either app or change the separate Guide app's copied schedule adapters.

## Verification

- `tsx --test tests/mcp-updates.test.ts`: four suites covering date/expiry filtering, no generated fallback, safe API queries and MCP registry parity.
- `tsc --noEmit` and root `npm run build` passed.
- Local built MCP queried live Open API transport and business-demography successfully.
- Local schedule routes checked against current upstream pages; expired flights excluded.
- Guide browser check: 29 tools, source/quality guidance, no browser errors.

Deployment is separate. The root maioazul project hosts these changes; deploying only apps/maio-api will not publish them.
