"use client";

import { openCookieSettings } from "@/components/cookie-consent";

export function CookieSettingsLink() {
  return <button type="button" className="underline decoration-1 underline-offset-4" onClick={openCookieSettings}>Cookie settings</button>;
}
