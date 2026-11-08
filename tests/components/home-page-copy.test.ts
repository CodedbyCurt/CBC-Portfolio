import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePage } from "@/components/home-page";

describe("homepage service and process copy", () => {
  it("positions the site for tradespeople and home-service businesses", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("Websites for tradespeople and home-service businesses.");
    expect(markup).toContain(
      "Websites for tradespeople and home-service businesses, including Plumbers, Electricians, Plasterers, Roofers, Builders, Bricklayers, Landscapers, Other home-service businesses.",
    );
    for (const trade of [
      "Plumbers",
      "Electricians",
      "Plasterers",
      "Roofers",
      "Builders",
      "Bricklayers",
      "Landscapers",
      "Other home-service businesses",
    ]) {
      expect(markup).toContain(trade);
    }
  });

  it("explains the basic SEO foundation without promising rankings", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("What does basic SEO setup mean?");
    expect(markup).toContain(
      "Basic SEO setup helps search engines understand what your website and services are about. This includes descriptive page titles and descriptions, clear page headings, relevant service and location information, a sitemap and essential indexing setup. It provides a technical SEO foundation but does not guarantee Google rankings or specific search positions.",
    );
  });

  it("explains the done-for-you approach alongside the four-step process", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("YOU KNOW YOUR TRADE. I’LL HANDLE THE WEBSITE.");
    expect(markup).toContain(
      "You could spend hours trying to build a website yourself, learning new tools and figuring out what goes where. Or you can leave the website development to me.",
    );
    expect(markup).toContain(
      "I build websites around your business, the services you offer and the customers you want to reach. You provide the trade knowledge, photos and feedback. I’ll handle the design, development and technical side.",
    );
    expect(markup).toContain("I build it for you.");
    expect(markup).toContain("No technical experience needed.");
    expect(markup).toContain("Built around your trade.");
    expect(markup).toContain("Tell me about the work");
    expect(markup).toContain("Agree the right scope");
    expect(markup).toContain("Review the first version");
    expect(markup).toContain("Get ready to launch");
  });
});
