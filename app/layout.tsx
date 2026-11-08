import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { siteConfig } from "@/lib/site-config";

const archivo = localFont({ src: "./fonts/archivo-latin.woff2", variable: "--font-display", display: "swap" });
const dmSans = localFont({ src: "./fonts/dm-sans-latin.woff2", variable: "--font-body", display: "swap" });
const plexMono = localFont({ src: "./fonts/ibm-plex-mono-latin.woff2", variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  alternates: { canonical: siteConfig.url },
  title: { default: `${siteConfig.name} | Websites for UK tradespeople`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  openGraph: { type: "website", locale: "en_GB", url: siteConfig.url, siteName: siteConfig.name, title: `${siteConfig.name} | Websites for UK tradespeople`, description: siteConfig.description },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className={`${archivo.variable} ${dmSans.variable} ${plexMono.variable}`}><body>{children}</body></html>;
}
