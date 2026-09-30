# Maio Dashboard

Independent copy of the MaioAzul dashboard, finance, orçamento, and chat, preserving Next.js 16.1.1, React 19.2.3, Tailwind 4, and the existing UI. `/` redirects to `/dashboard`.

Shared components, API routes, local datasets, public assets, data maintenance scripts, and supporting pages are copied here so existing navigation and chat document links keep working. Imports resolve inside this project; changes to the original app do not sync automatically.

Use Node.js 20.9 or newer (the default Node 18 shell cannot run Next.js 16).

From the repository root:

```sh
npm --workspace apps/maio-dashboard run dev
npm --workspace apps/maio-dashboard run build
npm --workspace apps/maio-dashboard run typecheck
npm --workspace apps/maio-dashboard run validate:budgets
```

Development and production start use port 3006. For a standalone checkout, run `npm install` in this folder first.

Local `.env.local` was copied from the source app and is ignored by Git. On another machine, supply the same environment configuration (including MongoDB and OpenAI credentials). Local files are cloned; remote databases and services remain the same ones selected by those settings. No database records are copied or seeded by this setup. Data mutation scripts must be run deliberately.

## Production

- URL: https://maio-dashboard.vercel.app
- Vercel project: `forkctokcs-projects/maio-dashboard`
- Project root: `apps/maio-dashboard`
- Install command: `npm install --workspaces=false`
- Initial production deployment: `dpl_GG5iUNS8WbVVogntsysV7T9FHZdK` (uploaded from the local working copy).
- Configured production variables: `MONGODB_URI`, `OPENAI_API_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_BASE_URL`, `DASHBOARD_BASE_URL`.
- Both URL settings point to the production URL above. Secrets use the original application's production services.
- Deployment verification: four pages, tourism baseline, budget, finance datasets, document manifest, and a live chat request all returned HTTP 200.
