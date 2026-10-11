# MaioAzul audit

Date: 11 October 2026. Repo: `thisiscarlosgomes/maioazul`. Commit reviewed: `ba636de` (`latest`) on `main`. This is an audit only. No application code was changed.

The public site is the Next.js app at the repo root (`package.json` name `my-app`, Next `16.1.1`, React `19.2.3`). `apps/maio-dashboard` is a second copy of that app. `apps/guide` and `apps/beach-volley-camp` carry further copies of the same Mongo client. `apps/maio-api` is a separate open-data API with a real test suite. `apps/stargazing` and `apps/maiocv` are smaller Next apps.

**Revoke a committed key before the code fixes.** `scripts/tacv_aviationstack.sh` line 4 sets `AVIATIONSTACK_KEY` to a string literal. The live flight route does not read that script. `docs/mcp-0.4.md` says unverified Aviationstack cache files are no longer consumed. The value is already in git history, so deleting the line is not enough. Revoke it in the Aviationstack account, then delete the script or read the key from the environment. Do not paste the old value into a commit or into chat.

## Do these first

### 1. Stop throwing when Mongo is missing

**Problem.** `lib/mongodb.ts` throws while the module is loading if `MONGODB_URI` is unset. Any file that imports it dies before its own handler runs. `next build` fails on that throw. `/blog` returns 500 even though the page has a try/catch. `/api/places` returns 500 even though the handler has a local JSON fallback.

**Evidence.** `lib/mongodb.ts` lines 4 to 6 throw `Invalid/Missing environment variable: "MONGODB_URI"` at module scope. The same throw is copied in `apps/maio-dashboard/lib/mongodb.ts`, `apps/guide/lib/mongodb.ts`, and `apps/beach-volley-camp/lib/mongodb.ts`.

Clean command, after `npm install --workspaces=false`:

```text
npx next build
```

Result: TypeScript passed, then `Failed to collect page data for /api/places/[id]`. The stack is the throw in `lib/mongodb.ts`, reached from `app/api/places/[id]/route.ts` line 2 (`import clientPromise from "@/lib/mongodb"`).

Dev server on `http://127.0.0.1:3000` with no `.env`:

| Request | Result |
| --- | --- |
| `GET /blog` | 500. Chrome showed the Next error page. The dev payload named the `MONGODB_URI` throw. `app/blog/page.tsx` lines 27 to 33 catch `listBlogPosts` errors, but the import of `lib/blog/repository.ts` line 2 loads Mongo first, so the catch never runs. |
| `GET /api/places` | 500 HTML, not the local places file. `app/api/places/route.ts` lines 17 to 22 would return `public/data/maio_places_with_coords.json` when the env var is missing, and lines 29 to 32 catch DB errors. The static import on line 2 throws before either path. |
| `GET /api/transparencia/admin` | 500 for the same import. |
| `POST /api/blog/admin/generate` | 500 for the same import, through `lib/blog/generate.ts`. |
| `GET /api/transparencia/municipal/maio/orcamento` | 200. `app/api/transparencia/municipal/maio/orcamento/route.ts` lines 7 to 30 import Mongo inside `try/catch` and then use `getBudgetDataset`. The log said `Mongo lookup failed, falling back to local dataset`. The body was the 2026 local budget. |
| `POST /api/visitors/track` | 500. Lighthouse recorded this on the home page. `app/api/visitors/track/route.ts` lines 39 to 40 import Mongo inside the handler with no missing-env check, so every page view logs a failed beacon when the variable is absent. |

**Fix.** In each `lib/mongodb.ts`, do not throw during import. Export `getMongoClient(): Promise<MongoClient | null>`. Return `null` when `MONGODB_URI` is missing. Create the `MongoClient` only on the first call that has a URI. Do not connect at module scope.

Then change static `import clientPromise` call sites to call `getMongoClient()` inside the handler. `app/api/places/route.ts` and `app/api/places/[id]/route.ts` already have the local-file branch. They only need the import to stop throwing. `app/blog/page.tsx` can then hit its existing catch and render an empty list instead of a 500. `app/api/visitors/track/route.ts` should return `{ ok: true, stored: false }` when `getMongoClient()` returns null, matching `app/api/feedback/route.ts` lines 86 to 88.

Apply the same getter in the four copies, or delete the copies as part of item 4. Until then, a fix only in the root file leaves guide, the camp app, and `apps/maio-dashboard` broken in the same way.

**Effort.** Small for the root client and the places, blog, and visitor routes. Medium if you touch all four copies in the same change.

**Impact.** `next build` can finish without a database. Blog and places APIs reach the fallbacks you already wrote. Page views stop posting a 500 to `/api/visitors/track` in local and preview deploys. Production with `MONGODB_URI` set at build time can already get past this particular build error. The getter still matters there, because a missing or rotated variable should degrade a route instead of taking down module load.

### 2. Stop pretending a failed fetch is an empty object

**Problem.** `fetchJsonOfflineFirst` returns `{}` when the response is not OK and when `fetch` throws. Callers are typed as if they received the real payload. The places page never shows its error state. The dashboard shows "Sem dados" when the API crashed.

**Evidence.** `lib/offline.ts` lines 193 to 207. `app/places/page.tsx` lines 54 to 58 call `.catch(() => setLoadError(true))`. That catch does not run, because the helper swallows the failure. Chrome on `/places` rendered real cards, including "Ribeira of Lagoa", from `public/data/maio_places_with_coords.json` (85 records). The static file is checked first (`lib/offline.ts` lines 63 to 65 and 155 to 160), so the places page can look healthy while `GET /api/places` is 500.

`public/data/offline/` contains only `.keep`. Tourism, transport, and weather snapshot paths in `buildOfflineUrl` point at files that are not in the repo. Chrome on `/dashboard` showed "Sem dados para os filtros atuais." for tourist pressure, seasonality, and country of origin, and zeros for maritime passengers, air passengers, aircraft, and ships. `GET /api/transparencia/turismo/2024/baseline` returned 500 from the Mongo import. The chart code treats `{}` as an empty dataset.

There is a second bug in the same file. Lines 128 to 130 use a regex literal `/^\/api\/transparencia\/turismo\/(\\d{4})\/island$/`. In a regex literal, `\\d` matches a backslash and the letter d, not a year. The later `startsWith("/api/transparencia/turismo/2024/")` branch still covers 2024. Other years miss the offline file.

**Fix.** Change `fetchJsonOfflineFirst` so a non-OK response and a network error reject with an `Error` that includes the URL and status. Do not return `{}`. Update callers to handle that rejection. `app/places/page.tsx` already has `loadError` copy. Use it. On the dashboard, show "could not load" rather than "Sem dados" when the request failed. Keep "Sem dados" for a real empty payload.

Replace `(\\d{4})` with `(\d{4})` on line 129.

Add `app/error.tsx` so a server exception renders a short message. There is no `error.tsx`, `not-found.tsx`, or `global-error.tsx` under `app/`.

**Effort.** Medium. The helper is one function. The dashboard page (`app/dashboard/page.tsx`, about 2,400 lines) calls it many times, so update those call sites in one pass and keep the empty-versus-error distinction.

**Impact.** A broken API stops looking like an island with no tourists. The places error state starts working when the static file is missing. Direct API clients still need item 1, because this helper only covers the browser.

### 3. Close the routes that spend money or dump data

**Problem.** Several routes are public. One of them treats a missing secret as permission to run.

**Evidence.**

Blog generation. `app/api/blog/admin/generate/route.ts` lines 13 to 18:

```ts
function isAuthorized(request: Request) {
  const secret = process.env.BLOG_CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get("x-blog-secret");
  return header === secret;
}
```

Lines 22 to 26 allow the request when that function returns true, even with no admin cookie. An empty `BLOG_CRON_SECRET=` is also falsy, so it fails open the same way. The live `POST /api/blog/admin/generate` returned 500 from the Mongo import, so this audit did not see a completed generation. The gate itself is fail-open. With Mongo configured and `BLOG_CRON_SECRET` unset, anyone can call `generateBlogDraftsFromInstruction`, which uses OpenAI and writes drafts. The catch on lines 47 to 53 returns `error.message` to the client.

Voice. `app/api/voice/route.ts` has no auth check. `POST /api/voice` returned `{"error":"Missing ELEVENLABS_API_KEY"}`, which proves the handler runs for anonymous callers. With a key, lines 55 to 95 send up to 600 characters to ElevenLabs and write the mp3 under `public/voice/`. The write happens after the paid call. If `writeFile` throws, the handler returns 500 and drops the bytes, so the next request misses the cache and pays again. A short file left on disk is then treated as a hit and sent with `Cache-Control: public, max-age=31536000, immutable`. Lines 84 to 89 return the upstream body to the caller. There is no rate limit.

Chat quota. `app/api/chat/route.ts` lines 1060 to 1064 return `{ allowed: true }` when the Mongo collection is missing. That bypass does not depend on the host. Lines 257 to 261 use the first `x-forwarded-for` hop as the client address. A caller can put a fresh address in that header on hosts that do not overwrite it. The Vercel edge replaces that header, so do not treat the header bypass as the Vercel bug. The missing-Mongo bypass still applies there. `normalizeMessages` (lines 223 to 226) keeps the last 12 strings with no character cap. `MAX_TOOL_ROUNDS` is 6, so one accepted request can call the model seven times. The quota write runs before `responses.create`. A provider error still keeps the timestamp, so five failures lock that bucket for 24 hours. `getRateLimitCollection` (lines 303 to 308) caches the promise even when initialization rejects, so the first Mongo blip makes every later chat return 500 until the process restarts. `POST /api/chat` in this environment returned `{"error":"Missing OPENAI_API_KEY"}` before the quota check, so the fail-open path was not executed live. The catch on lines 1327 to 1331 also returns `error.message`.

Raw admin data. `app/api/transparencia/admin/route.ts` lines 5 to 29 have no auth check. They return every `transparencia_raw` document's key, meta, and a 12-row sample. The live GET was 500 only because Mongo throws on import. With Mongo up, this is public.

Admin login is closed when unconfigured. `GET /api/admin/auth` returned `{"ok":true,"configured":false,"authenticated":false}`. `POST` with a wrong password returned 500 `Admin auth is not configured.` That part is fine. `lib/admin-auth.ts` lines 43 to 45 fall back to `ADMIN_PASSWORD` when `ADMIN_SESSION_SECRET` is unset, and lines 94 to 97 compare the password with `===`. With that fallback, a stolen cookie is an offline guess at the login password, and the password still works after the 12-hour expiry. `DELETE` only clears the browser cookie. There is no server-side session id to revoke, and `POST` has no attempt limit.

Feedback. `POST /api/feedback` returned `{"ok":true,"stored":false}` with no Mongo. `components/FeedbackDialog.tsx` treats any 2xx as success, clears the form, and closes. `sourcePath` is stored with no length cap. The GET is correctly gated by `isAdminAuthenticatedRequest`.

**Fix.** Do these as separate small edits.

1. In `isAuthorized`, return false when `BLOG_CRON_SECRET` is missing or blank. Require the admin session or an exact header match. Compare the header with `timingSafeEqual` on equal-length buffers.
2. In `consumeChatQueryQuota`, return `{ allowed: false }` when the collection is null or the lookup throws. If `getRateLimitCollection` rejects, clear the cached promise so the next request can retry. Debit the 24-hour window only after a model response is produced, or remove that timestamp in the `catch`. Cap each message (for example 2,000 characters) in `normalizeMessages`. On Vercel, ignore client `x-forwarded-for` and use the platform address. On other hosts, use the header that host overwrites (`cf-connecting-ip` or the last trusted hop).
3. At the top of `app/api/transparencia/admin/route.ts`, call `isAdminAuthenticatedRequest` and return `unauthorizedAdminResponse()` otherwise.
4. On `app/api/voice/route.ts`, reject unauthenticated calls, or require a short-lived same-site token. Add a per-IP daily cap. Return the audio bytes even if the cache write fails. Write the cache under `os.tmpdir()` with a temp file plus rename, and do not treat a short or empty file as a hit. Return a generic 502 and keep the upstream body in server logs only.
5. In chat, feedback, and blog generate, stop putting `error.message` in the JSON. Log it. Return a fixed sentence.
6. Require `ADMIN_SESSION_SECRET`. Do not fall back to the password. Compare the password with `timingSafeEqual`. Put a revocable session id in the token, and rate-limit `POST /api/admin/auth`.
7. When feedback is not stored, return 503. In `components/FeedbackDialog.tsx`, keep the form open. Cap `sourcePath`.

**Effort.** Small for steps 1, 3, 5, 6, and 7. Small to medium for chat and voice, because the quota key and the cache path need a decision about the host.

**Impact.** A missing cron secret stops being a public OpenAI button. Voice stops being an open ElevenLabs proxy. The raw transparency collection stops being world-readable. Chat stops skipping the 5-message cap whenever Mongo is down. Users stop seeing a saved-feedback state for a dropped message.

### 4. Make install and checks match the repo you actually have

**Problem.** A clean install from the lockfile fails. Nothing runs lint or tests on push. The dashboard app is a second full copy of the root app, so every fix has to be done twice.

**Evidence.** `npm ci` exited 1. npm said `package.json` and `package-lock.json` are out of sync. Missing from the lock: `maio-stargazing@0.1.0`, `maiocv@0.1.0`, and `next@16.4.0` (pulled by the stargazing range). `pnpm-lock.yaml` is lockfileVersion 9 and its importers section lists only `.`. It does not list the workspaces. `package.json` has no `packageManager` field and no `test` script. There is no `.github/` directory, no Prettier config, and no ESLint ignore for `apps/`.

`npx tsc --noEmit` exited 0. `tsconfig.json` has `"strict": true` and excludes `apps/**/*`. It does not enable `noUncheckedIndexedAccess`. The `include` array lists `"app/directory"` twice (lines 31 to 32). Strict mode still allows `any`, and the build later failed for the Mongo throw, so a green `tsc` does not mean the app builds.

`npx eslint .` exited 1 with 450 problems (241 errors, 209 warnings). The largest rules were `@typescript-eslint/no-explicit-any` (about 180), `@next/next/no-img-element` (about 92), and `@typescript-eslint/no-unused-vars` (about 81). ESLint walks `apps/`, including the duplicate trees, so the count is inflated by copies. `apps/guide/app/map/page.tsx` was the noisiest file.

Copy check from the repo root:

```text
diff -rq app apps/maio-dashboard/app          # only app/page.tsx
diff -rq lib apps/maio-dashboard/lib          # no differences
diff -rq components apps/maio-dashboard/components  # HomeClient.tsx whitespace only
diff -rq scripts apps/maio-dashboard/scripts  # no differences
diff -rq data apps/maio-dashboard/data        # no differences
```

Root `app/page.tsx` renders `HomeClient`. `apps/maio-dashboard/app/page.tsx` redirects to `/dashboard`. `lib/`, `data/`, `public/`, `scripts/`, and `tests/` match byte for byte. `components/HomeClient.tsx` differs by whitespace. Project metadata does not match. Dashboard `next.config.ts` traces `./data`, `./public/data`, and `./public/docs` into the serverless bundle and points Turbopack at the repo root when `node_modules/next` exists there. Root `next.config.ts` only sets `turbopack.root` to `process.cwd()`. Dashboard `package.json` adds `typecheck`, pins port 3006, and sets `engines.node`. `apps/maio-dashboard/README.md` says changes to the original app do not sync. `apps/guide` is a third large app with its own `lib/mongodb.ts` and many of the same API routes. It is not byte-identical.

**Fix.**

1. Pick npm or pnpm. Put that choice in `packageManager`. Delete the other lockfile. Generate one lock that includes every workspace you still ship. `npm ci` or `pnpm install --frozen-lockfile` must exit 0. Do not keep both locks.
2. Add a root `test` script that runs `node --test tests/tourism-baseline.test.mjs` and `npm test --workspace maio-open-api` and `npm test --workspace maio-stargazing`.
3. Add one GitHub Actions workflow on push and pull request. Steps: frozen install, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npx next build` with a dummy `MONGODB_URI` only after item 1 is fixed so the build does not need a real database. Fail the job on eslint errors.
4. Stop editing both trees. Either make `apps/maio-dashboard` a thin wrapper that imports the root app, or delete it and deploy the root app. Until that lands, any Codex edit under `app/`, `lib/`, `components/`, or `scripts/` must be repeated under `apps/maio-dashboard/` or it will drift. The whitespace-only `HomeClient.tsx` diff shows the drift has already started.
5. For `any`, start at the route handlers ESLint already flags (`app/api/transparencia/**`, `app/api/places/[id]/route.ts`). Parse Mongo documents with Zod at the boundary. Do not add `any` casts to silence the rule. Leave `apps/guide/app/map/page.tsx` for its own pass. It is a separate product surface.

**Effort.** Small for the lockfile choice, the test script, and a minimal workflow. Large for collapsing the dashboard copy. Medium for typing the root API handlers.

**Impact.** The next machine, including Codex, can install and see failures before a deploy. You stop fixing the same Mongo bug in four files. Lint becomes a signal instead of 241 inherited errors.

### 5. Upgrade Next, and stop blocking zoom

**Problem.** `npm audit` reports critical issues in the installed Next and MapLibre versions. The home page also disables pinch-zoom, which Lighthouse flags and which hurts low-vision visitors.

**Evidence.** After a root-only install, `npm ls --depth=0` showed `next@16.1.1` and `maplibre-gl@5.17.0`. `npm audit` on that tree reported 3 critical, 12 high, 5 moderate, and 1 low (21 total). Direct items worth acting on:

| Package | Installed | Audit note |
| --- | --- | --- |
| `next` | 16.1.1 | Critical range through 16.3.7. Fix listed as 16.4.0. Includes request-deserialization and image-optimizer DoS notes. |
| `maplibre-gl` | 5.17.0 | Critical range `<=6.4.0`. XSS in `DOM.sanitize()`. Fix listed as 6.13.0, which is a major bump. |
| `@modelcontextprotocol/sdk` | 1.27.1 | High, OAuth client credential bug in 1.12.0 through 1.30.1. This app uses the SDK as a server (`lib/mcp/server.ts`). Read the advisory and bump only if this process acts as an OAuth client. |

One Lighthouse run against the dev server, mobile, simulated throttling, 11 October 2026 10:23 UTC. Scores: performance 76, accessibility 94, best practices 96, SEO 100. This number is not a production LCP. The server was `next dev`. JavaScript was unminified (Lighthouse estimated 187 KiB). Simulated mobile CPU throttling is on. TTFB was 459 ms, about 7 percent of the 6.7 s LCP, so most of the 6.7 s is after the document. The LCP element was the home paragraph, not the photo. Do not ship a "6.7 s" claim. Two facts from that run do survive the dev caveat. The viewport audit failed because of `user-scalable=no`. `public/image.png` is 1.4 MB on disk, and the image audit estimated about 1.2 MB of savings from a modern format.

`app/layout.tsx` lines 66 to 70 set `maximumScale: 1`. Lines 115 to 117 repeat `maximum-scale=1.0, user-scalable=no` in a raw meta tag. `<html lang="en">` stays English when the UI switches to Portuguese (`components/HomeClient.tsx` only updates React state). Lines 84 to 91 load Google font CSS from a render-blocking stylesheet. The README still describes `next/font` and Geist. The layout does not use them.

**Fix.**

1. Bump root `next` and `eslint-config-next` from 16.1.1 to 16.4.0 or newer in the same 16.x line. Re-run `npm audit` and `npx next build`. Align `apps/maio-api` (`next@16.3.5`) and `apps/stargazing` (`next@^16.3.5`) so one install does not hoist a different `@next/swc`. A contaminated install during this audit produced `Mismatching @next/swc version, detected: 16.3.5 while Next.js is on 16.1.1` and `Missing field isPersistentCachingEnabled`. A clean root-only reinstall did not show that mismatch. The workspace version split is what creates it.
2. Plan the MapLibre 6 upgrade in its own change. Read the 6.x changelog, then bump to at least 6.13.0. Do not combine it with the Next bump.
3. In `app/layout.tsx`, delete `maximumScale` and the raw viewport meta. Keep `width=device-width, initial-scale=1`. When `useLang` changes language, set `document.documentElement.lang` to `pt` or `en`.
4. Convert `public/image.png` to AVIF or WebP, set `width` and `height` on the home `<img>`, and serve a smaller display size. 1.4 MB is the file today.

**Effort.** Small for the viewport and the Next bump. Medium for MapLibre 6 and the image.

**Impact.** The published Next DoS fixes land. Visitors can zoom. The home image stops shipping a 1.4 MB PNG. The 6.7 s figure should be remeasured on `next start` after the image change before you treat speed as done.

## Quick wins

Each of these is a single Codex prompt. Do them after item 1 if they touch Mongo imports. The auth edits do not need to wait.

1. `app/api/blog/admin/generate/route.ts`. Change `if (!secret) return true` to `return false`.
2. `lib/mongodb.ts`. Remove the top-level throw. Return null from a getter when `MONGODB_URI` is missing. Re-run `npx next build`.
3. `app/api/visitors/track/route.ts`. If Mongo is not configured, return `{ ok: true, stored: false }` and do not import the client.
4. `app/api/transparencia/admin/route.ts`. Require `isAdminAuthenticatedRequest` before the query.
5. `app/layout.tsx`. Remove `maximumScale: 1` and the `user-scalable=no` meta.
6. `lib/offline.ts` line 129. Change `(\\d{4})` to `(\d{4})`.
7. `lib/admin-auth.ts`. Require `ADMIN_SESSION_SECRET`. Compare passwords with `timingSafeEqual`.
8. Add `package.json` script `"test": "node --test tests/tourism-baseline.test.mjs"`.
9. Add `.env.example` with empty values for `MONGODB_URI`, `MONGODB_DB`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `BLOG_CRON_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Do not commit real values. `.gitignore` already ignores `.env*`.
10. Replace the create-next-app body of `README.md` with the real start command, the env file, and which app is the public site. Keep the admin note, and say the session secret is required.
11. Revoke the Aviationstack key in `scripts/tacv_aviationstack.sh` and delete the literal. See the note under the title.
12. In `app/api/blog/route.ts` and `app/api/blog/[slug]/route.ts`, return only `published` posts unless the admin cookie is valid.
13. Remove the `POST /api/partners` call or add the route. Remove `https://wa.me/XXXXXXXX` from `app/x/[slug]/page.tsx`.

## Architecture

**Overview.** A browser hits the root App Router. `app/layout.tsx` wraps every page in `LayoutShell`, a service worker register, and `VisitorTracker`. The home page is a client component with EN/PT copy and links to visitmaio.com, maio.cv, and `/campanha-azul`. Data pages (`/dashboard`, `/orcamento`, `/finance`, `/places`) are client components that call `/api/...`. Most of those routes read Mongo. A few read local JSON or a public HTTP API. `apps/maio-api` is the open-data service the MCP tools call at `https://api.maio.cv`.

**Key concepts.** `getMongoClient` should be the only database door. Today that door is a throwing module. `fetchJsonOfflineFirst` is the browser door, and it prefers a static file, then the API, then `{}`. `lib/chat/maio-data-tools.ts` and `lib/mcp/server.ts` expose the same tool list to the chat route and to `/api/mcp`. Admin auth is a 12-hour HMAC cookie, checked per route. There is no `middleware.ts`.

**How a dashboard number gets on screen.** The page calls `fetchJsonOfflineFirst`. The helper looks for a file under `public/data/offline`. Those files are not committed. The helper then calls an API route. The route imports `lib/mongodb.ts`. With no URI, the import throws and Next returns 500. The helper turns that 500 into `{}`. The chart renders the empty state. The budget route is the exception. It imports Mongo inside try/catch and falls back to `lib/budget.ts`, which reads local files. That is why `/orcamento` and `GET /api/transparencia/municipal/maio/orcamento` worked in this run.

**Where things live.**

| Path | Role |
| --- | --- |
| `app/` | Public site routes and 50 API handlers under `app/api`. |
| `components/` | Home, shell, charts, chat widget. |
| `lib/` | Mongo, offline fetch, budget, blog, chat tools, MCP, admin cookie. |
| `public/data/` | Places JSON, geojson, budget ingestion files. `offline/` is empty aside from `.keep`. |
| `scripts/` | Mongo upserts for budgets, tourism, energy, transfers, elections. |
| `tests/` | Two files. One runs. One does not load. |
| `apps/maio-api` | Open-data API. 63 tests once its own dependency is installed. |
| `apps/maio-dashboard` | Copy of the root app. Home redirects to `/dashboard`. |
| `apps/guide` | Visitor guide, including a very large `app/map/page.tsx`. |
| `apps/stargazing` | Sky UI. Its unit tests pass without extra installs. |
| `apps/maiocv` | Small Next app on port 3007. Not run in this audit. |
| `apps/beach-volley-camp` | Registration site with Stripe. Not run. It has the same Mongo throw. |
| `docs/mcp-0.4.md` | MCP notes. Not an app README. |

**Gotchas.**

- `apps/maio-dashboard` matches the root tree except the home page and one whitespace change. Fixing one side does not fix the other.
- Weather, wind, marine, and air routes do not use Mongo. They called Open-Meteo and returned live Maio values (for example weather 26.3°C, code 95, on 11 October 2026).
- `GET /api/schedules/boats` parsed a real CV Interilhas page and returned status `available` for 2026-10-11. The handler uses `AbortSignal.timeout(12000)` and does not fall back to an undated snapshot. That part is deliberate (`lib/offline.ts` lines 83 to 88).
- `GET /api/mcp/health` returned version `0.4.0` with no auth. The MCP route is a public read of the same tools as chat. That is acceptable only while every tool is read-only. Keep it that way.
- Chat instructions in `app/api/chat/route.ts` are a long Portuguese system prompt (about 1,300 lines for the whole route). Behavior changes there are easy to miss and hard to test.
- `app/dashboard/page.tsx` is about 2,400 lines and owns most indicator fetches. A new chart will land there unless you extract one fetcher per dataset.

## More recommendations

### TypeScript

**Problem.** `strict` is on, and `tsc` is clean, but external data is still `any` at the boundary. ESLint already errors on it. The compiler is not the thing catching bad API payloads.

**Evidence.** `npx tsc --noEmit` exit 0. ESLint `@typescript-eslint/no-explicit-any` on files such as `app/api/places/[id]/route.ts` lines 25 and 44, `app/api/transparencia/nacional/receitas/route.ts` lines 44 to 54, and `components/dashboard/TourismScaleChart.tsx` lines 18 to 34. `lib/offline.ts` line 194 returns `{} as T`, which is a cast that hides the failure in item 2.

**Fix.** Keep `strict`. Add `noUncheckedIndexedAccess` only after item 1, in its own change, and fix the errors it reports. Do not add it in the same edit as the Mongo getter. For new code, parse external JSON with Zod (`zod` is already a dependency, and `tests/mcp-updates.test.ts` shows `openDataSchemas` rejecting `../secret` and `limit: 501`). Prefer that pattern in the transparencia routes over `any`.

**Effort.** Medium, file by file. Do the places and receitas routes first.

**Impact.** A bad Mongo document fails in the parser instead of throwing halfway through a chart.

### Error handling

Item 1 and item 2 are the error-handling work. Extra rule for new routes: catch inside the handler, log the error, return a fixed JSON message and a non-200 status. Do not throw at import time. The budget route is the pattern to copy. The places route is the pattern that looks correct and does not run.

### Data fetching

**Problem.** Live upstreams are in good shape. The failure mode around them is not.

**Evidence.** Open-Meteo weather, wind, marine, and air returned 200 with plausible Maio numbers. Boats returned a parsed schedule. Flights returned FlightMapper source URLs. Budget fell back to local JSON. Tourism routes that import Mongo at top level returned 500. `scripts/build-offline-snapshot.mjs` exists (`npm run offline:snapshot`) but `public/data/offline` was not populated in git.

**Fix.** After item 1, run `npm run offline:snapshot` against a working server and commit the snapshot only if you want the dashboard to render those charts without Mongo. If you do not want stale public numbers in git, delete the unused `buildOfflineUrl` branches so the UI does not look for files that will never be there. Do not leave both "we have snapshots" and an empty directory.

**Effort.** Small to decide. Medium to generate and review a snapshot, because the numbers become public content.

**Impact.** Dashboard charts either show reviewed static numbers or they show an explicit load error. They stop showing zeros that came from `{}`.

### Tests

**Problem.** The open-data API has real tests. The root app does not run the tests it has, and one of them cannot load.

**Evidence.**

| Command | Result |
| --- | --- |
| `node --test tests/tourism-baseline.test.mjs` | 4 passed. The test transpiles `app/api/transparencia/turismo/2024/baseline/route.ts` and asserts the aggregated body, including a 503 when a source returns 500. This is a real behavior test. |
| `node --experimental-strip-types --test tests/mcp-updates.test.ts` | Failed to load. `ERR_MODULE_NOT_FOUND` for `/workspace/lib/schedules/parsers` imported without a `.ts` extension. The assertions themselves (boat times, flight validity, MCP tool list length 29) were not executed. |
| `npm test --workspace maio-open-api` before installing that app's deps | 12 files failed on `Cannot find package 'astronomy-engine'`. |
| Same command after a local `astronomy-engine@2.1.19` install | 63 passed, 0 failed. That install was not committed. |
| `node --test apps/stargazing/tests/*.test.mjs` | 4 passed. |
| Root `npm test` | No script. |

**Fix.** Add the test script from quick win 8. Fix `tests/mcp-updates.test.ts` so `node --test` can load it. The practical option is to run it with `tsx` (add it as a dev dependency) or to compile the imported modules first. Do not weaken the assertions. Put both commands in CI from item 4. Add one test that imports `app/api/places/route.ts` with `MONGODB_URI` unset and expects the local JSON array. That test would have caught item 1.

**Effort.** Small for the script and the places test. Small for the MCP loader once you pick tsx.

**Impact.** The next Mongo import regression fails in `npm test` instead of in `next build` on a deploy machine.

### Lint, format, and CI

Covered in item 4. There is no formatter. If you add Prettier, do it in its own commit after the dashboard copy is resolved, or the format diff will touch two trees and bury real edits.

### Dependencies and secrets

**Problem.** The lockfile is wrong (item 4), Next is behind on advisories (item 5), and env handling is inconsistent. No committed secret was found.

**Evidence.** Search of the repo for connection strings, `sk-` keys, and `AKIA` prefixes did not find live credentials. `.gitignore` ignores `.env*`. There is no `.env` in the checkout and no `.env.example`. README documents only `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET`. Scripts and routes also require the variables listed in quick win 9. `lib/mongodb.ts` throws instead of reporting a clear startup error. Feedback and visitor routes disagree on the missing-env status code.

**Fix.** Add `.env.example`. Keep secrets out of git. Bump Next as in item 5. Re-run `npm audit` after the lockfile is regenerated and fix remaining highs that are direct dependencies. Ignore audit noise in dev-only packages until the direct ones are done.

**Effort.** Small, aside from the MapLibre major.

**Impact.** A new checkout has a list of required variables. Audit has a shorter list after the Next bump.

### Performance

**Problem.** Production speed was not measured, because `next build` failed. The dev Lighthouse run is a single mobile simulation and is not a before/after number.

**Evidence.** See item 5 for the Lighthouse conditions. Extra timings on the already-compiled dev server, three sequential requests, one Node process, load average under 1 on 4 cores at the start of the audit:

| Path | Times | What it actually measured |
| --- | --- | --- |
| `GET /` | 61 ms, 32 ms, 29 ms | Compiled dev HTML. Not production. |
| `GET /dashboard` | 30 ms, 26 ms, 24 ms | Compiled dev HTML shell, not chart data. |
| `GET /api/maio/weather` | first observed 701 ms, then 6 ms, 4 ms, 5 ms | The fast repeats are the `revalidate = 3600` fetch cache in `app/api/maio/weather/route.ts`. They did not call Open-Meteo again. |
| `GET /api/schedules/boats` | 981 ms, 443 ms, 444 ms | `cache: 'no-store'` upstream fetch. Spread is larger than a single number can carry. Limiter was not profiled. Treat as inconclusive. |

**Fix.** Do not tune from the 6.7 s figure. After items 1 and 5, run Lighthouse once against `next start` and once more after converting `image.png`. Report the median only if you run at least five alternated measurements. The image file size and the zoom lock are worth doing without another benchmark.

**Effort.** Small to remeasure. Medium if the production LCP is still the 1.4 MB image or the Google font CSS.

**Impact.** You will know whether the home page is slow in production. Today you know the image is heavy and the dev server is not a fair clock.

### UX and accessibility

**Problem.** Zoom is disabled. Language is not reflected on `<html>`. Empty data and errors look the same. The blog page is a framework error screen.

**Evidence.** Lighthouse accessibility 94 on one dev run, with the viewport audit failed. Chrome text from `/` included the English hero and the Visit Maio / Maio Digital / Campanha Azul links. `/places` rendered place cards from the static file. `/blog` rendered no article title. `/dashboard` rendered the empty-state sentences quoted in item 2. Home images have alt text (`alt="Maio"`, `alt="MaioAzul"`). Language buttons are the letters `pt` and `en` with no `aria-pressed`. Favorite buttons on place cards do have `aria-label`s.

**Fix.** Item 5 covers zoom and `lang`. Item 2 covers empty versus error. Add `aria-pressed={lang === l}` on the language buttons in `components/HomeClient.tsx`. After item 1, `/blog` should render the empty list, and you can add one line of copy when `posts.length === 0` so a database outage is not a blank heading.

**Effort.** Small, once the data path is fixed.

**Impact.** Low-vision users can zoom. Screen readers get the right language. A failed chart is identifiable.

### Docs

**Problem.** `README.md` is still the create-next-app text, plus a short admin section. It tells you the app uses `next/font` and Geist. `app/layout.tsx` loads Inter, Orbitron, DM Sans, and other families from Google CSS instead.

**Evidence.** `README.md` lines 1 to 21 and 39 to 50. `docs/` contains only `docs/mcp-0.4.md` before this audit.

**Fix.** Quick win 10. In the same README edit, name the workspaces and say the root app is the public site. Point at `apps/maio-api` for the open-data tests. Delete the Geist paragraph or make the layout match it. Do not do both in a drive-by. Docs should describe the layout you keep.

**Effort.** Small.

**Impact.** The next session in Codex can boot the app without rediscovering env vars and the duplicate tree.

## What ran, and what did not

Environment: Node v22.14.0, npm 10.9.9, pnpm present, 4 cores. No `.env` file and no Mongo, OpenAI, or ElevenLabs credentials. Commands were run from `/workspace` unless noted.

| Command | Result |
| --- | --- |
| `npm ci` | Fail. Lockfile out of sync with workspaces. Details in item 4. |
| `npm install --workspaces=false` | Success. 666 packages. `package-lock.json` was restored afterward and is not part of this change. |
| `npx tsc --noEmit` | Pass. Does not typecheck `apps/`. |
| `npx eslint .` | Fail. 241 errors, 209 warnings. |
| `node --test tests/tourism-baseline.test.mjs` | Pass. 4 tests. |
| `node --experimental-strip-types --test tests/mcp-updates.test.ts` | Fail to load. Extensionless TypeScript import. |
| `node --test apps/stargazing/tests/*.test.mjs` | Pass. 4 tests. |
| `npm test` in `apps/maio-api` before its deps | Fail. Missing `astronomy-engine`. |
| `node --test tests/*.test.mjs` in `apps/maio-api` after installing `astronomy-engine@2.1.19` locally | Pass. 63 tests. Dependency install was not committed. |
| `npm run dev -- --hostname 127.0.0.1 --port 3000` | Ready in 615 ms. Next 16.1.1 Turbopack. |
| HTTP checks against that server | Recorded in items 1 to 3. Home, places, dashboard, chat, finance, orçamento, admin, feed, and guides returned HTML 200. Blog returned 500. |
| Headless Chrome DOM dump | Home, places, and dashboard rendered content. Blog rendered the Next error page. Chrome was killed by a 25 s timeout (exit 124) because the dev socket stays open. The DOM had already been written. |
| `npx lighthouse` on `http://127.0.0.1:3000/` | One mobile simulated run. Scores in item 5. Not a production measurement. |
| `npx next build` after a clean root install | Compile succeeded in 8.8 s. Failed collecting page data for `/api/places/[id]` because of the Mongo throw. |
| `npm audit` | 3 critical, 12 high, 5 moderate, 1 low. See item 5. |
| `GET /this-route-does-not-exist` | 404. |

Not run, and why:

- `npm ci` cannot succeed until the lockfile is regenerated. A full workspace install was not used for the build that counts, because mixing `next@16.1.1` and `next@16.3.5` hoisted a mismatched `@next/swc` and broke an earlier build. That earlier failure is discarded.
- `next start` was not run. The production build did not finish, so there is no production server to measure.
- `apps/guide`, `apps/beach-volley-camp`, and `apps/maiocv` dev servers were not started. Their Mongo client has the same throw. Guide's map page was not clicked through.
- Stripe, Cloudinary, ElevenLabs, and OpenAI were not called. The voice and chat routes were only checked up to the missing-key response.
- `pnpm install --frozen-lockfile` was not run. The lockfile's importer list has no workspaces, so a frozen pnpm install is not a credible clean path either.
- GitHub Actions does not exist, so there was no CI run to inspect.
- Lighthouse was one run on the dev server. Boat and weather timings were not profiled with a CPU profiler, so no production speedup or regression is claimed.

## Second pass

These items were checked against the files after the first write-up. They do not replace the five items above.

**One database name.** Seeds and some routes do not use the same Mongo database. `scripts/upsert-maio-energy-core.mjs` line 41 defaults `MONGODB_DB` to `maioazul` and line 124 calls `client.db(MONGODB_DB)`. `app/api/transparencia/municipal/maio/energia/route.ts` line 123 calls `client.db()` with no name, which is the database in the URI path, or `test` when the URI has none. Tourism routes and the tourism upserts both use `client.db()`, so they stay aligned with each other. Energy, transport, places, and blog do not. Put one `getDb()` next to `getMongoClient()` from item 1 and use it in every route and seed. Also drop a cached connection promise when `connect()` rejects. `lib/mongodb.ts` lines 18 to 31 keep that promise on `global` in development, so one failed boot stays failed until the process restarts.

**Missing numbers are stored as zero.** `app/api/transparencia/turismo/overview/route.ts` lines 135 to 137 set `occupancy_rate` from `occupancyMap[island] ?? 0`. A missing rate becomes `0.0` on a 200 response. The same pattern shows up for municipal pressure when population is missing, and `app/api/eleicoes/resultados-maio/route.ts` can return a zero-filled body with HTTP 200 when the snapshot is missing. Item 2 stops the client from hiding a 500. It does not stop a 200 that means "we invented a zero." Return `null` and a `missing` flag. Keep `0` only when the source document says zero.

**Draft posts are on the public API.** `app/api/blog/route.ts` lines 18 to 30 accept `?status=draft`, `approved`, and `all` with no admin check. `lib/blog/repository.ts` lines 119 to 125 load any slug, and `app/api/blog/[slug]/route.ts` returns that document. The HTML page at `app/blog/[slug]/page.tsx` lines 85 to 87 calls `notFound()` when status is not `published`, but `generateMetadata` lines 39 to 44 still emit the draft title and summary. Filter both API handlers to `published` unless `isAdminAuthenticatedRequest` is true.

**Broken forms and links.** `app/partners/page.tsx` line 170 POSTs `/api/partners`. There is no `app/api/partners/route.ts`. The camp app has that route. The root form cannot submit. `app/directory/page.tsx` links to `/experiences/[slug]`. That route does not exist. The placeholder experience page is `app/x/[slug]/page.tsx`, and it links to `https://wa.me/XXXXXXXX`. Point the directory at a real page or remove the links. Remove the fake WhatsApp number.

**First paint is empty.** `app/theme-provider.tsx` returns `null` until a `useEffect` reads `localStorage`. `LayoutShell` and the page sit under that provider, so the server HTML does not include them. Render the children on the server and apply the theme in the effect without unmounting the tree.

**The MCP test command in the docs does not match the root package.** `docs/mcp-0.4.md` line 16 says `tsx --test tests/mcp-updates.test.ts`. `tsx` is not a root dependency. The same doc says `tsc --noEmit` and `npm run build` passed. This audit's `npx next build`, with no `MONGODB_URI`, failed while collecting `/api/places/[id]`.

**Gitlinks with no submodule config.** `apps/offroad-maio`, `datagouv-mcp-inspect`, `mcp-ts-sdk-inspect`, and `mcp-ts-sdk-inspect2` are gitlinks (mode 160000). There is no `.gitmodules`. The working trees are empty. Delete the gitlinks or add the submodule URLs. Do not treat the empty folders as apps.

## How this audit was done

Skills read from the local pstack plugin and used to structure this pass: poteto-mode (investigation), how, blast-radius, benchmark-checklist, and interrogate. `~/.cursor/rules/pstack-models.mdc` was not in this environment. Read-only explorers and two adversarial reviewers were started with the skill default models. The findings in this file are the ones reproduced by the commands above. Reviewer notes that were not re-run are not included.

The safety claim this audit checked by running code: a missing `MONGODB_URI` throws during import, so static importers never reach their fallbacks. `next build` and the live `/blog` and `/api/places` responses fail in that way. The budget route, which imports inside try/catch, does fall back. That split is why the fix belongs in `lib/mongodb.ts` and not in another empty-state message.

Performance numbers above are labeled with run count and what else they might be measuring. The Lighthouse score is one untuned dev run. It is not a reason to rewrite the homepage. The 1.4 MB PNG and the zoom lock are.
