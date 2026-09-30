# Maio Sky

Standalone stargazing app in the Maio Azul workspace. Map the current sky from any location, search all 88 constellations, and point a supported phone toward their patterns. Defaults to Maio (15.25, −23.15), explicitly labeled until you choose another location.

## Run

From the repository root:

```sh
npm --prefix apps/stargazing ci --workspaces=false
npm run dev:api # separate terminal, port 3004
npm --prefix apps/stargazing run dev
```

Open http://localhost:3005. The app requires the Maio API with the `/api/v1/astronomy/sky-map` endpoint. No API keys or database are needed. Its own lockfile supports standalone installation and deployment with `apps/stargazing` as the project root. Build and start with `npm --prefix apps/stargazing run build` and `npm --prefix apps/stargazing run start`.

## API connection

The browser calls `/api/sky`; the app's server proxies to `/api/v1/astronomy/sky-map` on `MAIO_API_URL`. Set this server-only variable in `.env.local` or deployment settings. Development defaults to `http://localhost:3004`; production defaults to `https://maio-open-data.vercel.app`. Deploy the new API endpoint before deploying this client. `.env.example` shows both origins.

Live mode fetches every 15 seconds; changing location/time fetches immediately. Coordinates are rounded to the API's six-decimal precision. Obsolete requests are cancelled, and loading/error/retry states replace the map rather than silently using a local fallback. Requests time out after 10 seconds upstream / 12 seconds in the browser. Phone pointing and dragging use the latest response without making requests per sensor frame.

## Use

- **Location:** tap the location pill to request GPS access, or enter latitude/longitude in Sky settings. Denial preserves the explicitly labeled existing location.
- **Point at sky:** enable orientation permission, hold the phone upright, and point its back at the sky. Uses absolute orientation on supporting Android browsers and compass heading on supporting iOS browsers, including screen rotation. There is no camera feed or image recognition.
- **Manual mode:** drag the map, use arrow keys, or adjust direction/altitude in settings. Plus/minus changes the field of view. Select a constellation in the list to center it; search includes patterns below the horizon.
- **Time:** Sky settings accepts a local date/time (device timezone), years 2000–2100. Return to live sky resumes updates every 15 seconds.
- **Night vision:** red-tinted view. Lower device brightness separately when observing.

Phone location and orientation require a secure origin. Use a deployed HTTPS URL, or `npm --prefix apps/stargazing run dev:https` with a locally trusted development certificate. Plain HTTP on a LAN address cannot provide dependable sensor access. Browsers without absolute compass readings fall back to manual mode after eight seconds. Move the phone in a figure eight to calibrate, and keep away from magnets/metal. Heading is approximate and may be magnetic rather than true north; no magnetic-declination model is applied. Real-device field alignment still requires physical iOS/Android validation.

## Data and calculations

The catalogue and line geometry live exclusively in the Maio API, using its pinned d3-celestial import, commit `7e720a3de062059d4c5400a379146a601d9010e0`. Original attribution and BSD-3-Clause license remain in `apps/maio-api/data/astronomy/LICENSE`; provenance/checksums remain in the API catalogue. Upstream: https://github.com/ofrohn/d3-celestial. Two Serpens patterns are grouped into one identity.

Astronomy Engine 2.1.19 rotates J2000 positions to the observer horizon with precession, nutation and Earth rotation. Positions are calculated by the Maio API and fetched over HTTP; the browser only projects the returned horizon coordinates and handles device orientation. No duplicate catalogue or astronomy engine is bundled with this app. The rendered stars are pattern vertices, with schematic sizes, not a magnitude-complete star catalogue. Lines are conventional patterns, not IAU region boundaries. Proper motion, atmospheric refraction, terrain, clouds and extinction are not modeled. Above-horizon status means at least one pattern vertex is above 0°; list altitude is the highest pattern vertex. Daylight/twilight context comes from solar altitude. No prediction of naked-eye visibility is made.

Implementation references:
- https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md
- https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent

## Verify

```sh
npm --prefix apps/stargazing test
npm --prefix apps/stargazing run typecheck
npm --prefix apps/stargazing run build
```

App tests cover HTTP request/error handling, perspective projection and device orientation. The Maio API tests now cover global geometry, Serpens, both poles, parity with existing summaries, strict validation and ETags. Browser verification covers mobile/desktop layout, constellation search and selection, custom location/time, night vision, and sensor fallback. Physical compass accuracy cannot be certified by browser simulation.

## Production

- App: https://maio-sky.vercel.app
- Maio API: https://api.maio.cv
- Vercel project: `maio-sky`, scope `forkctokcs-projects`
- Production `MAIO_API_URL` is set to `https://api.maio.cv`.

Deploy independently from this app directory (the repository root belongs to another project):

```sh
npx vercel@59.22.0 deploy --prod --archive=tgz --scope forkctokcs-projects --yes --cwd apps/stargazing
```

This project uses explicit CLI deployments and is not connected to automatic Git deployments. The linked `.vercel/` metadata and downloaded environment files are ignored. Production was verified end-to-end against the API sky-map endpoint, including matching calculation revisions, all 88 constellations, public HTTPS access and rendered stars.
