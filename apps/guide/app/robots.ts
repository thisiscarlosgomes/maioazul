import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/places/images", "/mcp-guide"],
      },
    ],
    sitemap: "https://www.visit-maio.com/sitemap.xml",
    host: "https://www.visit-maio.com",
  };
}
