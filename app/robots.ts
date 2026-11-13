import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.AUTH_URL || "https://verk.rejisterjack.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/onboarding", "/docs"],
        disallow: ["/api/", "/t/", "/w/", "/~offline"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
