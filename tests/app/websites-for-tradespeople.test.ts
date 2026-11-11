import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TradespeoplePage, {
  metadata,
} from "@/app/websites-for-tradespeople/page";

describe("websites for tradespeople page", () => {
  it("renders a trade-specific page with a single H1 and requested navigation", () => {
    const markup = renderToStaticMarkup(createElement(TradespeoplePage));

    expect(markup.match(/<h1\b/g)).toHaveLength(1);
    expect(markup).toContain("WEBSITES BUILT AROUND YOUR TRADE.");
    expect(markup).toContain('id="main-content"');
    expect(markup).toContain("Website design for tradespeople");
    expect(markup).toContain("Do tradespeople really need a website if they already use Facebook?");
    expect(markup).toContain("Will my website automatically appear at the top of Google?");
    expect(markup).toContain("The Starter Website is £300 and the Complete Website is £500.");
    expect(markup).toContain('href="/#contact"');
    expect(markup).toContain('href="/#pricing"');
    expect(markup).toContain('href="/#work"');
    expect(markup).toContain('href="/"');
  });

  it("defines unique canonical, social and indexing metadata for the route", () => {
    expect(metadata).toMatchObject({
      title: "Website Design for UK Tradespeople",
      description:
        "Professional websites for UK tradespeople. Showcase your work, explain your services and make it easier for customers to contact you. Clear pricing from Coded by Curt.",
      alternates: {
        canonical: new URL(
          "https://www.codedbycurt.co.uk/websites-for-tradespeople",
        ),
      },
      openGraph: {
        title: "Website Design for UK Tradespeople | Coded by Curt",
        url: new URL("https://www.codedbycurt.co.uk/websites-for-tradespeople"),
      },
      twitter: {
        card: "summary_large_image",
        title: "Website Design for UK Tradespeople | Coded by Curt",
      },
      robots: { index: true, follow: true },
    });
  });
});
