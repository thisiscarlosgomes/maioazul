import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "node:path";

const appRoot = process.cwd();
const repoRoot = path.resolve(appRoot, "../..");
const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/**/*", "./public/data/**/*", "./public/docs/**/*"],
  },
  turbopack: {
    root: existsSync(path.join(repoRoot, "node_modules/next")) ? repoRoot : appRoot,
  },
};

export default nextConfig;
