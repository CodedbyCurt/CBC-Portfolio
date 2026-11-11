import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePage } from "@/components/home-page";

describe("homepage service and process copy", () => {
  it("keeps the first-impression section while omitting its introductory paragraphs", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("01 / Why a website");
    expect(markup).toContain("GOOD WORK DESERVES A GOOD FIRST IMPRESSION.");
    expect(markup).not.toContain("Your reputation matters.");
    expect(markup).not.toContain(
      "A professional website brings it all together, giving potential customers a clear reason to take the next step.",
    );
    expect(markup).toContain("Make the next step obvious");
    expect(markup).toContain("Help the right customers find what they need.");
    expect(markup).toContain("Let the quality speak for itself.");
    expect(markup).toContain("Give your reputation somewhere to go.");
    expect(markup).toContain("X01 / Why a website");
    expect(markup).toContain("GOOD WORK DESERVES A GOOD FIRST IMPRESSION.");
    expect(markup).toContain("SITE OR NO SITE. I’M HERE FOR YOU.");
    expect(markup).toContain("a complete redesign of the one you already have");
  });

  it("renders all four benefits in the scroll-peel stack", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));
    const cards = markup.match(/data-benefit-card="/g);

    expect(cards).toHaveLength(4);
    expect(markup).toContain("h-[500vh]");
    expect(markup).toContain("Scroll to explore / 04 benefits");
  });

  it("positions the site for tradespeople and home-service businesses", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("Professional websites for tradespeople and small businesses.");
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

  it("sets honest expectations about Google rankings", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("Will my website get me to the top of Google?");
    expect(markup).toContain(
      "No one can honestly guarantee that. Your website will have a sound technical SEO foundation and clear information about your business and services. Search visibility also depends on competition, your Google Business Profile and other factors.",
    );
  });

  it("explains social profile, Google Business Profile, and Meta Ads setup", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("What does Facebook and Instagram setup include?");
    expect(markup).toContain(
      "I’ll set up your Facebook business page and Instagram professional account, add your logo and business details, link them to your website and connect the profiles where appropriate.",
    );
    expect(markup).toContain("publish the first batch of images you provide");
    expect(markup).toContain("What does Google Business Profile setup do?");
    expect(markup).toContain("services, service area, contact information, website link, logo and photos you provide");
    expect(markup).toContain("What are Meta Ads?");
    expect(markup).toContain("daily, weekly or monthly budget you choose");
    expect(markup).toContain("The advertising spend is paid separately");
  });

  it("explains the done-for-you approach alongside the four-step process", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));
    const processCards = markup.match(/data-process-card="/g);

    expect(markup).toContain("YOU KNOW YOUR TRADE. I’LL TAKE CARE OF THE WEBSITE.");
    expect(processCards).toHaveLength(4);
    expect(markup).toContain("h-[420vh] sm:h-[440vh]");
    expect(markup).toContain("Scroll to follow the process / 04 steps");
    expect(markup).not.toContain(
      "You shouldn’t need to spend your evenings learning how to build a website.",
    );
    expect(markup).not.toContain(
      "You bring the knowledge of your trade, your services and your work.",
    );
    expect(markup).toContain("I’ll handle the website.");
    expect(markup).toContain("No jargon. No complicated setup.");
    expect(markup).toContain("Built around your trade.");
    expect(markup).toContain("Tell me about your business");
    expect(markup).toContain("Agree your website");
    expect(markup).toContain("Review your website");
    expect(markup).toContain("Get ready to go live");
    expect(markup).toContain("text-lg leading-8 text-paper/80 sm:text-xl sm:leading-9");
    expect(markup).not.toContain('class="font-mono text-sm text-signal">01</span>');
    expect(markup).not.toContain("text-6xl font-bold tracking-[-.08em] text-paper/10");
  });

  it("uses the requested copy for the partner and conversation sections", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("YOUR WEBSITE SHOULD WORK AS HARD AS YOU DO.");
    expect(markup).toContain(
      "I come from a family of tradespeople, so I understand the demands of working in the trade and how valuable your time is. The last thing you need is complicated web jargon or hours spent trying to build and manage a website yourself.",
    );
    expect(markup).toContain(
      "That&#x27;s why I keep things straightforward. I&#x27;ll listen to what your business needs, give you clear advice and build a professional website around the work you actually do – helping customers understand your services, see the quality of your work and get in touch.",
    );
    expect(markup).toContain("LET&#x27;S GET YOUR BUSINESS ONLINE.");
    expect(markup).toContain("Getting a website built with me is straightforward. Simply tell me:");
    expect(markup).toContain("What trade or industry you&#x27;re in.");
    expect(markup).toContain("What services you offer and the work you do.");
    expect(markup).toContain(
      "What you&#x27;d like your website to achieve – whether that&#x27;s getting more enquiries, showcasing your work, helping customers find you or making it easier for people to get in touch.",
    );
    expect(markup).toContain(
      "I&#x27;ll look at what your business needs and come back with a clear recommendation and price. There&#x27;s no pressure to go ahead.",
    );
    expect(markup).toContain('href="mailto:curt@codedbycurt.co.uk"');
  });
});
