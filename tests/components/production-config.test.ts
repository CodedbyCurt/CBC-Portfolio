import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePage } from "@/components/home-page";
import { siteConfig } from "@/lib/site-config";

describe("production site configuration", () => {
  it("uses the production domain and public email without unconfirmed contact links", () => {
    expect(siteConfig.businessName).toBe("Coded by Curt");
    expect(siteConfig.url).toBe("https://www.codedbycurt.co.uk");
    expect(siteConfig.email).toBe("curt@codedbycurt.co.uk");
    expect(siteConfig.serviceArea).toBe("United Kingdom");
    expect(siteConfig.phone).toBe("");
    expect(siteConfig.phoneHref).toBe("");
    expect(siteConfig.whatsappHref).toBe("");

    const markup = renderToStaticMarkup(createElement(HomePage));
    expect(markup).toContain('href="mailto:curt@codedbycurt.co.uk"');
    expect(markup).not.toContain("href=\"tel:");
    expect(markup).not.toContain("wa.me/");

    const structuredData = markup.match(
      /<script type="application\/ld\+json">([^<]+)<\/script>/,
    )?.[1];
    expect(structuredData).toBeDefined();
    expect(JSON.parse(structuredData ?? "{}")).toMatchObject({
      name: "Coded by Curt",
      url: "https://www.codedbycurt.co.uk",
      email: "curt@codedbycurt.co.uk",
      areaServed: { "@type": "Country", name: "United Kingdom" },
      serviceType: "Website design and development for tradespeople and small businesses",
    });
    expect(JSON.parse(structuredData ?? "{}")).not.toHaveProperty("telephone");
  });
});
