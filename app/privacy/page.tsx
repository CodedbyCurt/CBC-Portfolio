import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { CookieSettingsLink } from "@/components/privacy-cookie-settings-link";

const title = "Privacy Policy";
const description = "How Coded by Curt collects, uses and retains personal information and optional analytics data.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: new URL("/privacy", siteConfig.url) },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return <>
    <header className="bg-ink text-paper"><div className="container flex min-h-20 items-center justify-between gap-4 border-b border-paper/20 py-4"><Link href="/" className="display text-xl font-black tracking-[-.07em] sm:text-2xl" aria-label="Coded by Curt home">CODED <span className="text-signal">BY</span> CURT</Link><Link className="button-primary" href="/#contact">Get in touch</Link></div></header>
    <main id="main-content" tabIndex={-1}>
      <section className="bg-paper py-16 sm:py-24"><div className="container max-w-4xl">
        <p className="eyebrow border-t border-ink pt-5">Privacy policy · Last updated 8 November 2026</p>
        <h1 className="display mt-6 text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-7xl">YOUR INFORMATION, EXPLAINED CLEARLY.</h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-ink/75">This notice explains how Curtis Bennett, trading as Coded by Curt, handles personal information collected through codedbycurt.co.uk. It is information, not legal advice.</p>
      </div></section>
      <section className="bg-clay py-16 sm:py-24"><div className="container max-w-4xl space-y-12 text-ink">
        <PolicySection title="Who is responsible"><p>Curtis Bennett, trading as Coded by Curt, is the data controller for this website. For privacy questions or requests, email <a className="underline" href="mailto:curt@codedbycurt.co.uk">curt@codedbycurt.co.uk</a>.</p></PolicySection>
        <PolicySection title="Information collected when you enquire"><p>The enquiry form asks for your name, email address and/or phone number, plus the message you choose to send. This is used to understand your enquiry, respond, provide a quote or discuss potential work, and keep a record of the conversation where needed. Please do not include sensitive personal information in the form.</p></PolicySection>
        <PolicySection title="Where enquiries go"><p>Website enquiries are stored in a dedicated Supabase project for this portfolio. Netlify hosts the website and its server functions. Resend is used to send an internal business notification and, where you provide an email address, a confirmation email to you. Enquiry information may also be manually recorded in a separate customer-management system where it is needed to manage a customer relationship. There is no automatic website-to-CRM integration.</p></PolicySection>
        <PolicySection title="Analytics cookies"><p>Google Analytics 4 is optional. It is loaded only after you actively accept analytics cookies and is used to understand aggregated page use and successful enquiry counts. It is not needed for the website or enquiry form. The implementation sends no names, email addresses, phone numbers, enquiry messages or other form content to Google. Google signals and advertising personalisation are disabled in the website tag.</p><p className="mt-4">Google Analytics enhanced measurement settings are controlled in the Google Analytics property. Before publishing, the owner should confirm that form interactions and any site-search measurement are disabled unless they have reviewed them and can ensure no personal information is collected.</p><CookieSettingsLink /></PolicySection>
        <PolicySection title="Retention"><p>Unsuccessful enquiries are reviewed and deleted as soon as they are no longer needed, and no later than 12 months after the last meaningful contact. Customer and business records may be retained separately where there is a genuine legal, accounting or contractual reason. Copies manually recorded outside the website must follow the same review and deletion policy.</p><p className="mt-4">The website database does not currently record the date of last meaningful contact, so this review is manual rather than automated. Email-delivery records are not deleted separately before the associated enquiry review.</p></PolicySection>
        <PolicySection title="Your rights and complaints"><p>Depending on the circumstances, you may have rights to access, correct, erase, restrict or object to use of your information, and to request portability. Contact us first at the email above. You may also raise a concern with the UK Information Commissioner’s Office (ICO) at <a className="underline" href="https://ico.org.uk/make-a-complaint/" rel="noreferrer">ico.org.uk</a>.</p></PolicySection>
        <PolicySection title="What needs confirming"><p>This notice does not state a postal address, company registration, provider location, international-transfer arrangement or legal basis because those details have not been verified for publication. The owner should confirm whether any of these details, and any additional retention obligations, need to be added before relying on this notice.</p></PolicySection>
      </div></section>
    </main>
    <footer className="bg-ink py-8 text-paper"><div className="container flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-wider text-paper/60"><Link href="/">Coded by Curt</Link><div className="flex gap-5"><Link href="/privacy">Privacy</Link><CookieSettingsLink /><Link href="/#contact">Get in touch</Link></div></div></footer>
  </>;
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-t border-ink pt-5"><h2 className="display text-3xl font-black tracking-[-.05em] sm:text-4xl">{title}</h2><div className="mt-4 max-w-3xl leading-7 text-ink/75">{children}</div></section>;
}
