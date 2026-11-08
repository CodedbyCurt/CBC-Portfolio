import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("uses the canonical production URL without a generated last-modified date", () => {
    expect(sitemap()).toEqual([
      {
        url: "https://codedbycurt.co.uk",
        changeFrequency: "monthly",
        priority: 1,
      },
      {
        url: "https://codedbycurt.co.uk/websites-for-tradespeople",
        changeFrequency: "monthly",
        priority: 0.8,
      },
    {
      url: "https://codedbycurt.co.uk/privacy",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ]);
  });
});
