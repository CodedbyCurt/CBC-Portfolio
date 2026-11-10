"use client";

import { useEffect, useSyncExternalStore } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_STORAGE_KEY,
  GTM_CONTAINER_ID,
  initializeAnalyticsConsent,
  notifyAnalyticsConsent,
  setAnalyticsConsent,
  trackPageView,
  type AnalyticsConsent,
} from "@/lib/client/analytics";

const gtmBootstrap = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`;

function isAnalyticsConsent(value: unknown): value is AnalyticsConsent {
  return value === "accepted" || value === "rejected";
}

function subscribeToConsentChanges(callback: () => void): () => void {
  window.addEventListener(ANALYTICS_CONSENT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function hasAnalyticsConsent(): boolean {
  return window.__cbcConsentModeInitialized === true &&
    window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) === "accepted";
}

export function GoogleTagManager() {
  const enabled = useSyncExternalStore(subscribeToConsentChanges, hasAnalyticsConsent, () => false);
  const pathname = usePathname();

  useEffect(() => {
    initializeAnalyticsConsent();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== ANALYTICS_CONSENT_STORAGE_KEY && event.key !== null) return;
      const saved = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
      setAnalyticsConsent(isAnalyticsConsent(saved) ? saved : "rejected");
    };
    window.addEventListener("storage", handleStorageChange);

    const saved = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (isAnalyticsConsent(saved)) {
      setAnalyticsConsent(saved);
      notifyAnalyticsConsent(saved);
    }

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (enabled) trackPageView(pathname);
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
          height="0"
          width="0"
          title="Google Tag Manager"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {gtmBootstrap}
      </Script>
    </>
  );
}
