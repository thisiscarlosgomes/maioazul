import type { NextConfig } from "next";

const bulkyTracedAssets = [
  "./apps/**/*",
  "./public/voice/**/*",
  "./public/places/**/*",
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingExcludes: {
    "/api/finance/datasets": bulkyTracedAssets,
    "/api/transparencia/municipal/maio/orcamento": bulkyTracedAssets,
  },
};

export default nextConfig;
