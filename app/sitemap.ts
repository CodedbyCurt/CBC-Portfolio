import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, changeFrequency: "monthly", priority: 1 },
    {
      url: new URL("/websites-for-tradespeople", siteConfig.url).toString(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: new URL("/privacy", siteConfig.url).toString(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
