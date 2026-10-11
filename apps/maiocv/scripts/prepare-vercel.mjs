import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(root, "next.config.ts"), "utf8");

if (/output:\s*["']export["']/.test(source)) {
  console.error(
    'maiocv production is a Next server build. Remove output: "export" before deploying.',
  );
  process.exit(1);
}

console.log(
  "maiocv production build is `npm run build`. Vercel publishes `.next` (see vercel.json).",
);
