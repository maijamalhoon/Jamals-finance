import type { MetadataRoute } from "next";

const siteUrl = "https://jamals-finance-sable.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/accounts/",
        "/transactions/",
        "/goals/",
        "/investments/",
        "/liabilities/",
        "/settings/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}