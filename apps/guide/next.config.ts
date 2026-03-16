import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const rootDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(rootDir, "..", "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: repoRoot,
  },
  async headers() {
    return [
      {
        source: "/visitmaio.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
