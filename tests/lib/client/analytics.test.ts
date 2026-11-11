import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  resetAnalyticsForTests,
  setAnalyticsConsent,
  trackGenerateLead,
  trackPageView,
} from "@/lib/client/analytics";
import { readAnalyticsConsent, saveAnalyticsConsent } from "@/components/cookie-consent";

function installBrowser() {
  const calls: unknown[][] = [];
  const dataLayer: unknown[] = [];
  vi.stubGlobal("window", {
    dataLayer,
    gtag: (...args: unknown[]) => calls.push(args),
    location: { hostname: "www.codedbycurt.co.uk", origin: "https://www.codedbycurt.co.uk", pathname: "/" },
  });
  vi.stubGlobal("document", {
    cookie: "_ga=test; _ga_ABC=test",
    querySelector: vi.fn(() => null),
    createElement: vi.fn(() => ({ dataset: {} })),
    head: { append: vi.fn() },
  });
  return { calls, dataLayer };
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
    const { calls, dataLayer } = installBrowser();
    trackPageView("/");
    trackGenerateLead("first");
    setAnalyticsConsent("rejected");
    trackPageView("/privacy");
    trackGenerateLead("second");
    expect(dataLayer).toEqual([]);
    expect(calls).toContainEqual(["consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    }]);
    expect(calls).toContainEqual(["consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    }]);
  });

  it("grants analytics only after acceptance and sends no PII with a lead", () => {
    const { calls, dataLayer } = installBrowser();
    setAnalyticsConsent("accepted");
    trackPageView("/privacy");
    trackGenerateLead("submission-key");
    trackGenerateLead("submission-key");
    expect(calls).toContainEqual(["consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    }]);
    expect(dataLayer).toContainEqual({
      event: "page_view",
      page_path: "/privacy",
      page_location: "https://www.codedbycurt.co.uk/",
    });
    expect(dataLayer.filter((event) => (event as { event?: string }).event === "generate_lead")).toHaveLength(1);
    expect(JSON.stringify(dataLayer)).not.toContain("submission-key");
    expect(ANALYTICS_CONSENT_STORAGE_KEY).toBe("cbc-analytics-consent");
  });

  it("stops future tracking and clears analytics cookies after withdrawal", () => {
    const { calls, dataLayer } = installBrowser();
    setAnalyticsConsent("accepted");
    trackPageView("/before-withdrawal");
    trackGenerateLead("before-withdrawal");
    setAnalyticsConsent("rejected");
    trackPageView("/after-withdrawal");
    trackGenerateLead("submission-key");
    expect(dataLayer.filter((event) => (event as { event?: string }).event === "generate_lead")).toHaveLength(1);
    expect(dataLayer.filter((event) => (event as { event?: string }).event === "page_view")).toHaveLength(1);
    expect(calls).toContainEqual(["consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    }]);
    expect(document.cookie).toContain("Max-Age=0");
  });
});
