import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePage } from "@/components/home-page";

describe("homepage pricing section", () => {
  it("shows both website packages and the complete website illustration", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));
    const pricing = markup.slice(
      markup.indexOf('<section id="pricing"'),
      markup.indexOf('<section id="faq"'),
    );

    expect(pricing).toContain("Starter Website");
    expect(pricing).toContain("£270");
    expect(pricing).toContain(
      "One page containing the essential information customers need to understand your business and contact you.",
    );
    expect(pricing).toContain("Complete Website");
    expect(pricing).toContain("£400");
    expect(pricing).toContain(
      "A more developed website with separate pages for your services, business and previous work. Give customers more detail, make navigation easier and create more opportunities for relevant search content.",
    );
    expect(pricing).toContain("Recommended");
    expect(pricing).toContain("Everything in Starter");
    expect(pricing).toContain("Areas you cover");
    expect(pricing).toContain("Basic SEO setup");
    expect(pricing).toContain('media="(prefers-reduced-motion: reduce)"');
    expect(pricing).toContain("/animations/study-discussion-static.svg");
    expect(pricing).toContain("/animations/study-discussion.svg");
    expect(pricing).toContain("Add Online Presence");
    expect(pricing).toContain(
      "Get the Online Presence Package for £55 instead of £70 when purchased with this website.",
    );
    expect(pricing).toContain("Combined price: £325. Save £15.");
    expect(pricing).toContain("Add Business Visibility");
    expect(pricing).toContain(
      "Get the Business Visibility Package for £139 instead of £169 when purchased with this website.",
    );
    expect(pricing).toContain("Combined price: £539. Save £30.");
    expect(pricing).toContain("motion-safe:hover:-translate-y-1");
    expect(pricing).toContain("focus-visible:outline-paper");
    expect(pricing).toMatch(
      /<a href="#package-deals"[^>]*>\s*<span class="eyebrow">Add Online Presence<\/span>/,
    );
    expect(pricing).toMatch(
      /<a href="#package-deals"[^>]*>\s*<span class="eyebrow">Add Business Visibility<\/span>/,
    );
  });

  it("describes individual digital services and separates advertising and printing costs", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));
    const pricing = markup.slice(
      markup.indexOf('<section id="pricing"'),
      markup.indexOf('<section id="faq"'),
    );

    expect(pricing).toContain("Facebook and Instagram setup");
    expect(pricing).toContain("Google Business Profile setup");
    expect(pricing).toContain("Google Search and Google Maps");
    expect(pricing).toContain("Meta Ads setup");
    expect(pricing).toContain("Ad spend and ongoing management are separate.");
    expect(pricing).toContain("QR-code Google review materials");
    expect(pricing).toContain("Printing costs extra.");
    expect(pricing).toContain("Business card design");
  });

  it("shows accurate package deals, recurring care, bundles, and enquiry links", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));
    const pricing = markup.slice(
      markup.indexOf('<section id="pricing"'),
      markup.indexOf('<section id="faq"'),
    );

    expect(pricing).toContain("Online Presence Package");
    expect(pricing).toContain("Normally £80 · Save £10");
    expect(pricing).toContain("Business Visibility Package");
    expect(pricing).toContain("Normally £195 · Save £26");
    expect(pricing).toContain("Meta Ads account and initial campaign setup");
    expect(pricing).toContain("£29/month");
    expect(pricing).toContain("Up to 30 minutes of small text and photo updates each month");
    expect(pricing).toContain("Domain registration and renewals");
    expect(pricing).toContain("Starter Website + Online Presence");
    expect(pricing).toContain("£325");
    expect(pricing).toContain("Normally £340 · Save £15");
    expect(pricing).toContain("Complete Website + Business Visibility");
    expect(pricing).toContain("£539");
    expect(pricing).toContain("Normally £569 · Save £30");
    expect(pricing.match(/href="#contact"/g)).not.toBeNull();
    expect(pricing).toContain("doesn’t include unlimited changes or support.");
    expect(pricing).toContain("Not sure what you need?");
    expect(pricing.indexOf('id="package-deals"')).toBeLessThan(
      pricing.indexOf("02 / Individual add-ons"),
    );
    expect(pricing).toContain('<h4 class="eyebrow text-paper">Not sure what you need?</h4>');
    expect(pricing).toContain("mt-4 text-sm leading-6 text-paper/75");
    expect(pricing).toContain("tracking-wider text-paper underline decoration-signal");
    expect(pricing).toContain(
      "Tell me a little about your business and I&#x27;ll help you work out which services would be useful.",
    );
    expect(pricing).toContain("Let&#x27;s talk");
  });
});
