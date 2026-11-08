import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Hero, HomePage } from "@/components/home-page";

describe("homepage hero typewriter fallback", () => {
  it("renders the original headline and a readable static phrase before JavaScript", () => {
    const markup = renderToStaticMarkup(createElement(Hero));

    expect(markup).toContain('aria-label="LOOK THE PART BEFORE THEY CALL."');
    expect(markup).toContain('<span class="hero-kinetic-line" aria-hidden="true">');
    expect(markup).toContain('<span class="hero-kinetic-line text-signal" aria-hidden="true">');
    expect(markup).toContain(
      '<span class="kinetic-char"><span class="kinetic-char-sizer" aria-hidden="true">L</span><span class="kinetic-char-glyph">L</span></span>',
    );
    expect(markup).toContain("A CLEAR STARTING POINT. A PRICE AGREED UP FRONT.");
    expect(markup).toContain('poster="/portfoliohero-poster.avif"');
    expect(markup).toContain('preload="none"');
    expect(markup).not.toContain("<source src=\"/portfoliohero.mp4\"");
    expect(markup).toContain('<span class="sr-only">SHOWCASE YOUR WORK.</span>');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('aria-live="');
  });

  it("keeps the editable wordmark accessible and preserves its orange BY segment", () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain('id="main-content"');
    expect(markup).toContain('aria-label="CodedbyCurt home"');
    expect(markup).toContain('<span class="kinetic-word text-signal" aria-hidden="true">');
    expect(markup).toContain(
      '<span class="kinetic-char-sizer" aria-hidden="true">B</span>',
    );
    expect(markup).toContain('<span class="kinetic-char-glyph">B</span>');
  });
});
