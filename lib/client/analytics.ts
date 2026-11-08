export const GA_MEASUREMENT_ID = "G-JRSN0QWS9F";

export type AnalyticsConsent = "accepted" | "rejected";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let consent: AnalyticsConsent | null = null;
const trackedLeadKeys = new Set<string>();

function canUseBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function gtag(...args: unknown[]): void {
  window.gtag?.(...args);
}

function pageLocation(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

function clearAnalyticsCookies(): void {
  if (!canUseBrowser()) return;
  for (const name of document.cookie.split(";").map((cookie) => cookie.trim().split("=")[0])) {
    if (!name || (name !== "_ga" && !name.startsWith("_ga_"))) continue;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${window.location.hostname}; SameSite=Lax`;
  }
}

export function setAnalyticsConsent(value: AnalyticsConsent): void {
  consent = value;
  if (!canUseBrowser()) return;

  if (value === "rejected") {
    window[`ga-disable-${GA_MEASUREMENT_ID}` as keyof Window] = true as never;
    clearAnalyticsCookies();
    return;
  }

  window[`ga-disable-${GA_MEASUREMENT_ID}` as keyof Window] = false as never;
  window.dataLayer ??= [];
  window.gtag ??= (...args: unknown[]) => window.dataLayer?.push(args);
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: true,
    page_location: pageLocation(),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  if (!document.querySelector(`script[data-cbc-ga="${GA_MEASUREMENT_ID}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.dataset.cbcGa = GA_MEASUREMENT_ID;
    document.head.append(script);
  }
}

export function trackPageView(path: string): void {
  if (consent !== "accepted" || !canUseBrowser()) return;
  gtag("event", "page_view", { page_path: path, page_location: pageLocation() });
}

export function trackGenerateLead(idempotencyKey: string): void {
  if (consent !== "accepted" || trackedLeadKeys.has(idempotencyKey)) return;
  trackedLeadKeys.add(idempotencyKey);
  gtag("event", "generate_lead");
}

export function resetAnalyticsForTests(): void {
  consent = null;
  trackedLeadKeys.clear();
}
