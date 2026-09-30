import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, "../..");
const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  turbopack: { root: existsSync(path.join(repoRoot, "package.json")) ? repoRoot : appRoot },
};
export default config;
