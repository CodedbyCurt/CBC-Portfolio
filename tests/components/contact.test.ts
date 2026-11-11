import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Contact } from "@/components/home-page";

describe("contact form accessibility", () => {
  it("renders labeled fields, keyboard-submittable button, and live status feedback", () => {
    const markup = renderToStaticMarkup(createElement(Contact));

    expect(markup).toContain('name="name"');
    expect(markup).toContain('name="phone"');
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="message"');
    expect(markup).toContain('type="submit"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Your name");
    expect(markup).toContain("Phone number");
    expect(markup).toContain("Required");
    expect(markup).toContain("Optional if you provide an email address.");
    expect(markup).toContain("Optional if you provide a phone number.");
    const nameInput = markup.match(/<input[^>]*name="name"[^>]*>/)?.[0] ?? "";
    const phoneInput = markup.match(/<input[^>]*name="phone"[^>]*>/)?.[0] ?? "";
    const emailInput = markup.match(/<input[^>]*name="email"[^>]*>/)?.[0] ?? "";
    expect(nameInput).toContain("required");
    expect(phoneInput).not.toContain("required");
    expect(emailInput).not.toContain("required");
    expect(markup).toContain("Email address");
    expect(markup).toContain("Your trade, service area and the work you want more of");
    expect(markup.indexOf("Getting a website built with me is straightforward.")).toBeGreaterThan(
      markup.indexOf("</form>"),
    );
  });
});
