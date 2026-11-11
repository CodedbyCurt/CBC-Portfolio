import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePage } from "@/components/home-page";
import { siteConfig } from "@/lib/site-config";

describe("portfolio text reveals", () => {
  it("keeps portfolio introductions and project text visible in server-rendered HTML", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("Selected work / Three live projects");
    expect(markup).toContain('aria-label="Selected work" class="h-[360vh] bg-ink text-paper lg:h-[480vh]"');
    expect(markup).toContain("w-[min(90vw,620px)]");
    expect(markup).toContain(
      'sizes="(prefers-reduced-motion: reduce) and (max-width: 911px) 68vw, (max-width: 688px) 90vw, 620px"',
    );
    expect(markup).toContain("Three live websites built for tradespeople and local businesses.");
    expect(markup).toContain("Sites built solo this year");
    expect(markup).toContain("40+");
    expect(siteConfig.projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "JMB Plastering", location: "Live project" }),
        expect.objectContaining({
          name: "Current Electrical",
          location: expect.stringContaining("Live project"),
          image: "/projects/current-electrical-2026.png",
          imageWidth: 1872,
          imageHeight: 1248,
        }),
        expect.objectContaining({
          name: "Riverside Plumbing",
          location: "Live project",
          image: "/projects/riverside-plumbing.png",
          imageWidth: 1706,
          imageHeight: 988,
        }),
      ]),
    );
    expect(siteConfig.projects[1].liveUrl).toBeUndefined();
    expect(siteConfig.projects[2].liveUrl).toBeUndefined();
    expect(markup).not.toContain("concept");
    expect(markup).not.toContain("Concept");
    expect(markup).not.toContain('href="#contact" class="mt-7 inline-flex items-center gap-2 border-b border-current pb-1 font-mono text-xs font-bold uppercase tracking-wider">Discuss a site like this');
    expect(markup).toContain("<h2");
    expect(markup).toContain("JMB Plastering");
    expect(markup).toContain("url=%2Fprojects%2Fcurrent-electrical-2026.png");
    expect(markup).toContain("url=%2Fprojects%2Friverside-plumbing.png");
    expect(markup).toContain("The customer’s challenge");
    expect(markup).not.toContain('style="opacity:0;transform:translateY(14px)"');
  });
});
