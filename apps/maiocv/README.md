# MaioCV

A Portuguese landing page and dedicated `/mcp` experience for Maio's digital initiatives. Self-contained Next.js app with a static export, local photography and fonts. No environment variables or backend required.

Use Node.js 20.9 or newer (the app includes `.nvmrc` for Node 20). From the repository root:

```sh
npm --workspace apps/maiocv run dev
npm --workspace apps/maiocv run build
npm --workspace apps/maiocv run typecheck
```

Development: http://localhost:3007. Build output: `apps/maiocv/out`.

## Hosting

Set the project's root directory to `apps/maiocv`, install with `npm install`, build with `npm run build`, and publish `out` on any static host. The app can also be copied outside the monorepo and installed independently. `next start` is not used for static exports; serve `out` with a static file server.

Initiative URLs live in `app/page.tsx`: API at https://api.maio.cv, Portal de Dados at https://portal.maio.cv, and VisitMaio at https://visitmaio.com. These are the initiative destinations specified for MaioCV.

Images are reused from `apps/guide/public/places/pontapreta.jpg` and `vila2.jpg`; the font is reused from the repository's `public/fonts`. No external assets are fetched at runtime.

## Vercel production deployments

Production: https://maiocv.vercel.app

Project: `maiocv`, team: `forkctokcs-projects`. The initial production deployment uses the tested static export via Vercel's Build Output API. The local project link is stored in ignored `.vercel/project.json`.

For subsequent deployments, run from `apps/maiocv` with Node 20.9+ and an authenticated Vercel CLI:

```sh
# Only needed on a fresh checkout:
vercel link --yes --project maiocv --scope forkctokcs-projects
npm run build
npm run vercel:prepare
vercel deploy --prebuilt --prod --archive=tgz --scope forkctokcs-projects
```

This publishes the static output only. No custom domain reassignment or Git auto-deployment is configured by this workflow.

## UI and MCP demo

The homepage introduces VisitMaio, Portal de Dados, Open Data API and Maio in ChatGPT. Shared navigation and the footer are in `components/site-shell.tsx`; initiative URLs and the provided ChatGPT plugin URL are in `lib/content.ts`.

`/mcp` submits real questions to `/api/maio-chat`, proxied to `https://portal.maio.cv/api/chat`. This existing backend uses the same `executeMaioTool` registry as the MCP server, including open-data tools; the landing page does not directly speak MCP. Credentials stay in the backend. Requests ask for at most 60 words or three short points. The three exact preset questions return prepared answers immediately; custom questions use the API. The per-user daily quota has been removed in both shared API copies; that change requires deploying the dashboard backend. Recent conversation stays in component memory and is cleared when switching topics. Errors, timeouts and rate limits are shown without fabricated fallback answers.

Development uses a Next.js rewrite; static production uses the external rewrite in `scripts/prepare-vercel.mjs`. Deploy with that script to preserve the chat route.

The opt-in OpenUI pilot is at `/chat?openui=1`. When the assistant uses the `business-demography` dataset, the client reads its published total row from `api.maio.cv` and renders a sourced metric card with OpenUI. The text answer remains the fallback if the visual data cannot be loaded. Normal `/chat` stays text-only while the pilot is evaluated.

Framer Motion powers viewport section reveals, initiative card interactions and demo transitions. Reduced-motion preferences skip movement. Content remains visible in the server-rendered HTML.

Run on port 3001 from this app directory with `../../node_modules/.bin/next dev --port 3001`. The prebuilt deployment script maps `/mcp` to its static HTML export.
