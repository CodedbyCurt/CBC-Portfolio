import { afterEach, describe, expect, it, vi } from "vitest";
import { GA_MEASUREMENT_ID, resetAnalyticsForTests, setAnalyticsConsent, trackGenerateLead, trackPageView } from "@/lib/client/analytics";
import { readAnalyticsConsent, saveAnalyticsConsent } from "@/components/cookie-consent";

function installBrowser() {
  const scripts: { dataset: Record<string, string>; async?: boolean; src?: string }[] = [];
  const calls: unknown[][] = [];
  vi.stubGlobal("window", {
    dataLayer: [],
    gtag: (...args: unknown[]) => calls.push(args),
    location: { hostname: "codedbycurt.co.uk", origin: "https://codedbycurt.co.uk", pathname: "/" },
  });
  vi.stubGlobal("document", {
    cookie: "_ga=test; _ga_ABC=test",
    querySelector: vi.fn(() => null),
    createElement: vi.fn(() => ({ dataset: {} })),
    head: { append: (script: { dataset: Record<string, string> }) => scripts.push(script) },
  });
  return { calls, scripts };
}

afterEach(() => { resetAnalyticsForTests(); vi.unstubAllGlobals(); });

describe("analytics consent", () => {
  it("persists and reads only explicit analytics choices", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    saveAnalyticsConsent(storage, "accepted");
    expect(readAnalyticsConsent(storage)).toBe("accepted");
    values.set("cbc-analytics-consent", "unknown");
    expect(readAnalyticsConsent(storage)).toBeNull();
  });

  it("does not request or send analytics before consent or after rejection", () => {
    const { calls, scripts } = installBrowser();
    trackPageView("/");
    trackGenerateLead("first");
    setAnalyticsConsent("rejected");
    trackPageView("/privacy");
    trackGenerateLead("second");
    expect(calls).toEqual([]);
    expect(scripts).toEqual([]);
  });

  it("loads GA only after acceptance and sends no PII with a lead", () => {
    const { calls, scripts } = installBrowser();
    setAnalyticsConsent("accepted");
    trackGenerateLead("submission-key");
    trackGenerateLead("submission-key");
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
    expect(calls).toContainEqual(["event", "generate_lead"]);
    expect(JSON.stringify(calls)).not.toContain("submission-key");
  });

  it("stops future tracking and clears analytics cookies after withdrawal", () => {
    const { calls } = installBrowser();
    setAnalyticsConsent("accepted");
    setAnalyticsConsent("rejected");
    trackGenerateLead("submission-key");
    expect(calls.filter((call) => call[1] === "generate_lead")).toEqual([]);
    expect(document.cookie).toContain("Max-Age=0");
  });
});
