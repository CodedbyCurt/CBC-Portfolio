import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { siteConfig } from "@/lib/site-config";
import { CookieConsent } from "@/components/cookie-consent";
import { GoogleTagManager } from "@/components/google-tag-manager";
import { Analytics } from "@vercel/analytics/next";

const archivo = localFont({ src: "./fonts/archivo-latin.woff2", variable: "--font-display", display: "swap" });
const dmSans = localFont({ src: "./fonts/dm-sans-latin.woff2", variable: "--font-body", display: "swap" });
const plexMono = localFont({ src: "./fonts/ibm-plex-mono-latin.woff2", variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  alternates: { canonical: siteConfig.url },
  title: { default: `${siteConfig.businessName} | Website Design for UK Tradespeople & Small Businesses`, template: `%s | ${siteConfig.businessName}` },
  description: siteConfig.description,
  openGraph: { type: "website", locale: "en_GB", url: siteConfig.url, siteName: siteConfig.businessName, title: `${siteConfig.businessName} | Website Design for UK Tradespeople & Small Businesses`, description: siteConfig.description },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.businessName} | Website Design for UK Tradespeople & Small Businesses`,
    description: siteConfig.description,
    images: [{ url: new URL("/opengraph-image", siteConfig.url), alt: "Coded by Curt — websites for UK tradespeople and small businesses" }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" className={`${archivo.variable} ${dmSans.variable} ${plexMono.variable}`}><body><GoogleTagManager /><a className="skip-link" href="#main-content">Skip to content</a>{children}<CookieConsent /><Analytics /></body></html>;
}
