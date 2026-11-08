import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePage } from "@/components/home-page";

describe("portfolio text reveals", () => {
  it("keeps portfolio introductions and project text visible in server-rendered HTML", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain("Selected work / One live project, two concepts");
    expect(markup).toContain("The plastering site is a live client project.");
    expect(markup).toContain("<h2");
    expect(markup).toContain("JMB Plastering");
    expect(markup).toContain("The customer’s challenge");
    expect(markup).not.toContain('style="opacity:0;transform:translateY(14px)"');
  });
});
