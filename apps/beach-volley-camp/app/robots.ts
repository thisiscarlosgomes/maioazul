import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://mbv.maioazul.com/sitemap.xml",
    host: "https://mbv.maioazul.com",
  };
}
