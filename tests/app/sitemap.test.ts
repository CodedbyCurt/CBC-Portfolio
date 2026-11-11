import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("uses the canonical production URL without a generated last-modified date", () => {
    expect(sitemap()).toEqual([
      {
        url: "https://www.codedbycurt.co.uk",
        changeFrequency: "monthly",
        priority: 1,
      },
      {
        url: "https://www.codedbycurt.co.uk/websites-for-tradespeople",
        changeFrequency: "monthly",
        priority: 0.8,
      },
    {
      url: "https://www.codedbycurt.co.uk/privacy",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ]);
  });

  it("points robots.txt at the canonical sitemap host", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://www.codedbycurt.co.uk/sitemap.xml",
    });
  });
});
