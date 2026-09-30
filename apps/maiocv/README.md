# MaioCV

A single-page Portuguese landing page for Maio's digital initiatives. Self-contained Next.js app with a static export, local photography and fonts. No environment variables or backend required.

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
