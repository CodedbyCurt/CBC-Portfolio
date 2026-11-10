"use client";

import { startTransition, useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  notifyAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/client/analytics";

const openEvent = "cbc-open-cookie-settings";

type ConsentStorage = Pick<Storage, "getItem" | "setItem">;

export function readAnalyticsConsent(storage: ConsentStorage): AnalyticsConsent | null {
  const saved = storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
  return saved === "accepted" || saved === "rejected" ? saved : null;
}

export function saveAnalyticsConsent(storage: ConsentStorage, value: AnalyticsConsent): void {
  storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(openEvent));
}

export function CookieConsent() {
  const [preference, setPreference] = useState<AnalyticsConsent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const saved = readAnalyticsConsent(window.localStorage);
    if (saved) {
      startTransition(() => setPreference(saved));
    }
    const open = () => setSettingsOpen(true);
    window.addEventListener(openEvent, open);
    return () => window.removeEventListener(openEvent, open);
  }, []);

  const choose = (value: AnalyticsConsent) => {
    saveAnalyticsConsent(window.localStorage, value);
    setPreference(value);
    setAnalyticsConsent(value);
    notifyAnalyticsConsent(value);
    setSettingsOpen(false);
  };

  if (preference && !settingsOpen) return null;
  return (
    <section
      className="fixed inset-x-0 bottom-0 z-[60] border-t-2 border-ink bg-paper p-4 text-ink shadow-[0_-8px_30px_rgba(23,23,20,.2)] sm:p-6"
      aria-labelledby="cookie-consent-title"
      role="dialog"
      aria-modal={settingsOpen || preference === null}
    >
      <div className="container grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="eyebrow text-[#a03416]">Cookie choices</p>
          <h2 id="cookie-consent-title" className="display mt-2 text-2xl font-black tracking-[-.04em]">ANALYTICS, ON YOUR TERMS.</h2>
          <p className="mt-2 text-sm leading-6 text-ink/75">
            With your permission, Coded by Curt uses Google Analytics to understand general site use. It is optional and does not affect the enquiry form. Read the <a className="underline decoration-1 underline-offset-4" href="/privacy">privacy policy</a>.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="button-secondary" onClick={() => choose("rejected")}>Reject analytics</button>
          <button type="button" className="button-primary" onClick={() => choose("accepted")}>Accept analytics</button>
          {preference && <button type="button" className="button-secondary" onClick={() => setSettingsOpen(false)}>Close</button>}
        </div>
      </div>
    </section>
  );
}
