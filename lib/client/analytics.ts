export const GTM_CONTAINER_ID = "GTM-KPDNWGRL";
export const ANALYTICS_CONSENT_STORAGE_KEY = "cbc-analytics-consent";
export const ANALYTICS_CONSENT_EVENT = "cbc-analytics-consent-change";

export type AnalyticsConsent = "accepted" | "rejected";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __cbcConsentModeInitialized?: boolean;
  }
}

const deniedConsentState = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

let consent: AnalyticsConsent | null = null;
let consentModeInitialized = false;
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

export function initializeAnalyticsConsent(): void {
  if (!canUseBrowser() || consentModeInitialized) return;

  if (window.__cbcConsentModeInitialized) {
    consentModeInitialized = true;
    return;
  }

  window.dataLayer ??= [];
  window.gtag ??= (...args: unknown[]) => window.dataLayer?.push(args);
  gtag("consent", "default", deniedConsentState);
  window.__cbcConsentModeInitialized = true;
  consentModeInitialized = true;
}

export function notifyAnalyticsConsent(value: AnalyticsConsent): void {
  if (!canUseBrowser()) return;
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: value }));
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

  initializeAnalyticsConsent();
  gtag("consent", "update", {
    analytics_storage: value === "accepted" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  if (value === "rejected") {
    clearAnalyticsCookies();
  }
}

export function trackPageView(path: string): void {
  if (consent !== "accepted" || !canUseBrowser()) return;
  window.dataLayer?.push({
    event: "page_view",
    page_path: path,
    page_location: pageLocation(),
  });
}

export function trackGenerateLead(idempotencyKey: string): void {
  if (consent !== "accepted" || trackedLeadKeys.has(idempotencyKey)) return;
  trackedLeadKeys.add(idempotencyKey);
  window.dataLayer?.push({ event: "generate_lead" });
}

export function resetAnalyticsForTests(): void {
  consent = null;
  consentModeInitialized = false;
  trackedLeadKeys.clear();
}
