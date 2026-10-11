import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/mcp", "/chat"].map((path) => ({ url: new URL(path, SITE_URL).href }));
}
