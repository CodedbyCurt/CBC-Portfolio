import { describe, expect, it } from "vitest";
import { metadata } from "@/app/privacy/page";

describe("privacy page metadata", () => {
  it("uses route-specific Open Graph and Twitter metadata on the canonical URL", () => {
    const url = new URL("https://www.codedbycurt.co.uk/privacy");
    const image = new URL("https://www.codedbycurt.co.uk/opengraph-image");
    const title = "Privacy Policy | Coded by Curt";
    const description =
      "How Coded by Curt collects, uses and retains personal information and optional analytics data.";
    const imageAlt =
      "Coded by Curt — websites for UK tradespeople and small businesses";

    expect(metadata).toMatchObject({
      title: "Privacy Policy",
      description,
      alternates: { canonical: url },
      openGraph: {
        url,
        title,
        description,
        images: [{ url: image, alt: imageAlt }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [{ url: image, alt: imageAlt }],
      },
    });
  });
});