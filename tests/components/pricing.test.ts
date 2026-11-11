import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePage } from "@/components/home-page";

describe("homepage pricing section", () => {
  it("shows the intended website packages, inclusions, and add-on offers", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));
    const pricing = markup.slice(
      markup.indexOf('<section id="pricing"'),
      markup.indexOf('<section id="faq"'),
    );

    expect(pricing).toContain("Starter Website");
    expect(pricing).toContain("£300");
    expect(pricing).toContain(
      "A professional one-page website covering the essentials, giving customers a clear introduction to your business and an easy way to contact you.",
    );
    expect(pricing).toContain("Complete Website");
    expect(pricing).toContain("£500");
    expect(pricing).toContain(
      "A website of up to five pages, giving your services, business information and previous work the space they deserve.",
    );
    expect(pricing).toContain("Recommended");
    expect(pricing).toContain("Everything needed for a professional website");
    expect(pricing).toContain("Up to five pages");
    expect(pricing).toContain("Dedicated pages for your services");
    expect(pricing).toContain("Dedicated page gallery displaying all your work");
    expect(pricing).toContain("About your business and how you work");
    expect(pricing).toContain("More room for project photos and details");
    expect(pricing).toContain("Areas you cover");
    expect(pricing).toContain("Basic work gallery");
    expect(pricing).toContain("Basic SEO setup");
    expect(pricing).toContain("Need more than five pages?");
    expect(pricing).toContain("Request a tailored quote");
    expect(pricing).toContain('media="(prefers-reduced-motion: reduce)"');
    expect(pricing).toContain("/animations/study-discussion-static.svg");
    expect(pricing).toContain("/animations/study-discussion.svg");
    expect(pricing).toContain("Add Online Presence");
    expect(pricing).toContain(
      "Get the Online Presence Package for £45 instead of £60 when purchased with this website.",
    );
    expect(pricing).toContain("Combined price: £345. Save £15.");
    expect(pricing).toContain("Add Business Visibility");
    expect(pricing).toContain(
      "Get the Business Visibility Package for £129 instead of £159 when purchased with this website.",
    );
    expect(pricing).toContain("Combined price: £629. Save £30.");
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
    expect(pricing).toContain("Business card design featuring your Google review QR code");
    expect(pricing).toContain("including a print-ready design file. Physical printing is an additional cost.");
    expect(pricing.match(/class="shrink-0 font-mono text-sm font-bold">£35<\/p>/g)).toHaveLength(2);
    expect(pricing.match(/class="shrink-0 font-mono text-sm font-bold">£70<\/p>/g)).toHaveLength(1);
    expect(pricing.match(/class="shrink-0 font-mono text-sm font-bold">£10<\/p>/g)).toHaveLength(1);
    expect(pricing.match(/class="shrink-0 font-mono text-sm font-bold">£30<\/p>/g)).toHaveLength(1);
  });

  it("shows accurate package deals, recurring care, bundles, and enquiry links", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));
    const pricing = markup.slice(
      markup.indexOf('<section id="pricing"'),
      markup.indexOf('<section id="faq"'),
    );

    expect(pricing).toContain("Online Presence Package");
    expect(pricing).toContain("Normally £70 · Save £10");
    expect(pricing).toContain("Business Visibility Package");
    expect(pricing).toContain("Normally £180 · Save £21");
    expect(pricing).toContain('<p class="mt-3 font-mono text-2xl font-bold">£60</p>');
    expect(pricing).toContain('<p class="mt-3 font-mono text-2xl font-bold">£159</p>');
    expect(pricing).toContain("Facebook business page setup");
    expect(pricing).toContain("Instagram professional account setup");
    expect(pricing).toContain("Google Business Profile setup");
    expect(pricing).toContain("TikTok business account setup (if required)");
    expect(pricing).toContain("Everything in Online Presence");
    expect(pricing).toContain("Meta Ads account and initial campaign setup");
    expect(pricing).toContain(
      "Business card design featuring the Google review QR code, with a print-ready design file",
    );
    expect(pricing).toContain("£29/month</span>");
    expect(pricing).toContain("line-through");
    expect(pricing).toContain("First 2 months free, then £29.99/month.");
    expect(pricing).toContain("12 monthly payments minimum after the free period.");
    expect(pricing).toContain(
      "Regular website maintenance and technical checks",
    );
    expect(pricing).toContain(
      "Contact form checks to help make sure customer enquiries can reach you",
    );
    expect(pricing).toContain("Up to 30 minutes of small text and photo updates every month");
    expect(pricing).toContain("Help with website and domain-related technical issues");
    expect(pricing).toContain("Basic website support when you need advice or a change");
    expect(pricing).toContain("Basic on-page SEO and Google visibility checks");
    expect(pricing).toContain("Domain registration and renewals");
    expect(pricing).toContain("Starter Website + Online Presence");
    expect(pricing).toContain("£345");
    expect(pricing).toContain("Normally £360 · Save £15");
    expect(pricing).toContain("Complete Website + Business Visibility");
    expect(pricing).toContain("£629");
    expect(pricing).toContain("Normally £659 · Save £30");
    expect(pricing.match(/href="#contact"/g)).not.toBeNull();
    expect(pricing).toContain("doesn’t include unlimited changes or support.");
    expect(pricing).toContain("Not sure what you need?");
    expect(pricing.indexOf("Starter Website")).toBeLessThan(
      pricing.indexOf("Complete Website"),
    );
    expect(pricing.indexOf("Complete Website")).toBeLessThan(
      pricing.indexOf("Need more than five pages?"),
    );
    expect(pricing.indexOf("Need more than five pages?")).toBeLessThan(
      pricing.indexOf('id="package-deals"'),
    );
    expect(pricing.indexOf('id="package-deals"')).toBeLessThan(
      pricing.indexOf("02 / Optional digital services"),
    );
    expect(pricing.indexOf("02 / Optional digital services")).toBeLessThan(
      pricing.indexOf("04 / Ongoing support"),
    );
    expect(pricing.indexOf("04 / Ongoing support")).toBeLessThan(
      pricing.indexOf("05 / Website + digital presence"),
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
