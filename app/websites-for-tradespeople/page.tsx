import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

const pageTitle = "Website Design for UK Tradespeople";
const pageDescription =
  "Professional websites for UK tradespeople. Showcase your work, explain your services and make it easier for customers to contact you. Clear pricing from Coded by Curt.";
const pageUrl = new URL("/websites-for-tradespeople", siteConfig.url);

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: pageUrl },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: pageUrl,
    siteName: siteConfig.businessName,
    title: `${pageTitle} | Coded by Curt`,
    description: pageDescription,
    images: [
      {
        url: new URL("/opengraph-image", siteConfig.url),
        alt: "Coded by Curt — website design for UK tradespeople",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${pageTitle} | Coded by Curt`,
    description: pageDescription,
    images: [
      {
        url: new URL("/opengraph-image", siteConfig.url),
        alt: "Coded by Curt — website design for UK tradespeople",
      },
    ],
  },
  robots: { index: true, follow: true },
};

const customerQuestions = [
  {
    title: "What services do you offer?",
    copy: "A clear list helps people quickly see whether you take on the job they need.",
  },
  {
    title: "Which areas do you cover?",
    copy: "A straightforward coverage area helps visitors judge whether your service is relevant to them.",
  },
  {
    title: "What work have you completed?",
    copy: "Genuine project photographs can show the kind of work you do and the finish you deliver.",
  },
  {
    title: "How do I get in touch?",
    copy: "Visible contact details and a simple enquiry route make the next step clear.",
  },
];

const usefulContent = [
  {
    number: "01",
    title: "Services in plain English",
    copy: "Describe the jobs you take on and what customers can expect. Clear service information helps people understand whether you are the right fit.",
  },
  {
    number: "02",
    title: "Photographs of your work",
    copy: "Use genuine project photographs you have permission to share. A well-organised gallery gives visitors useful context about your work.",
  },
  {
    number: "03",
    title: "Business and coverage details",
    copy: "Include accurate business information and the areas you actually cover, so customers can decide whether to contact you.",
  },
  {
    number: "04",
    title: "A clear way to get in touch",
    copy: "Make the contact options easy to find, whether a customer wants to call, email or send an enquiry.",
  },
];

const faqs = [
  {
    question: "Do tradespeople really need a website if they already use Facebook?",
    answer:
      "Facebook can be useful for updates and conversation, and you can keep using it. A website gives your services, work, coverage information and contact options a clear place of their own that customers can refer back to.",
  },
  {
    question: "Can my website show the jobs I’ve completed?",
    answer:
      "Yes. A gallery or work page can show genuine project photographs you have permission to use, with useful context about the work where appropriate.",
  },
  {
    question: "Can you include the different services I offer?",
    answer:
      "Yes. Services can be described clearly on one page or, in a larger site, given separate pages where that helps customers find the right information.",
  },
  {
    question: "Do I need to provide the website content?",
    answer:
      "You provide accurate information about your business, services and coverage, plus photographs you have permission to use. I’ll help organise the information, build the site and ask you to review it before launch.",
  },
  {
    question: "Can you build a website if I work anywhere in the UK?",
    answer:
      "Yes. Coded by Curt works with tradespeople and home-service businesses across the United Kingdom. Your site can explain the areas you serve, based on the coverage you confirm.",
  },
  {
    question: "Will my website automatically appear at the top of Google?",
    answer:
      "No. A website can have clear content and a sound technical SEO foundation, but no one can guarantee a particular ranking or number of enquiries. Search results depend on many factors, including competition and your wider online presence.",
  },
  {
    question: "How much does a tradesperson’s website cost?",
    answer:
      "The Starter Website is £270 and the Complete Website is £400. The one-page Starter covers essential business information; the 3–5 page Complete gives more room for separate services, work and business details. See the pricing section for the current full inclusions.",
  },
];

export default function TradespeoplePage() {
  return (
    <>
      <header className="bg-ink text-paper">
        <div className="container flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-paper/20 py-4">
          <Link
            href="/"
            className="display text-xl font-black tracking-[-.07em] sm:text-2xl"
            aria-label="Coded by Curt home"
          >
            CODED <span className="text-signal">BY</span> CURT
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] font-bold uppercase tracking-wider sm:text-xs" aria-label="Page navigation">
            <Link className="transition-colors hover:text-signal" href="/#work">
              Work
            </Link>
            <Link className="transition-colors hover:text-signal" href="/#pricing">
              Pricing
            </Link>
            <Link className="transition-colors hover:text-signal" href="/#contact">
              Get in touch
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-paper py-20 sm:py-28 lg:py-36">
          <div className="container">
            <p className="eyebrow border-t border-ink pt-5">
              Website design for tradespeople · United Kingdom
            </p>
            <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end lg:gap-16">
              <h1 className="display max-w-4xl text-5xl font-black leading-[.86] tracking-[-.08em] sm:text-7xl lg:text-8xl">
                WEBSITES BUILT AROUND YOUR TRADE.
              </h1>
              <div>
                <p className="max-w-xl text-lg leading-7 text-ink/75 sm:text-xl sm:leading-8">
                  Give prospective customers a clear place to understand the services you offer,
                  see examples of your work and get in touch. Coded by Curt builds websites for
                  tradespeople and home-service businesses across the UK.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link className="button-primary" href="/#contact">
                    Get a straight-talking quote
                  </Link>
                  <Link className="button-secondary" href="/#pricing">
                    View website packages
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-clay py-20 lg:py-28" aria-labelledby="work-speaks">
          <div className="container">
            <div className="grid gap-8 border-t border-ink pt-5 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="eyebrow">01 / Make the important details clear</p>
                <h2
                  id="work-speaks"
                  className="display mt-6 max-w-xl text-4xl font-black leading-[.9] tracking-[-.07em] sm:text-6xl"
                >
                  YOUR WORK SHOULD SPEAK FOR ITSELF.
                </h2>
              </div>
              <div>
                <p className="max-w-2xl text-lg leading-7 text-ink/75">
                  Before contacting a tradesperson, people often want to check a few practical
                  things. A well-organised website puts those answers where they can find them,
                  instead of making them search through posts or guess what to ask.
                </p>
                <div className="mt-8 grid gap-px border border-ink bg-ink sm:grid-cols-2">
                  {customerQuestions.map((item, index) => (
                    <article key={item.title} className="bg-paper p-5 sm:p-6">
                      <p className="font-mono text-xs font-bold text-signal">
                        0{index + 1}
                      </p>
                      <h3 className="display mt-5 text-2xl font-black leading-none tracking-[-.04em]">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-ink/70">{item.copy}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-paper py-20 lg:py-28" aria-labelledby="built-for-trade">
          <div className="container">
            <div className="grid gap-8 border-t border-ink pt-5 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="eyebrow">02 / Useful information, well organised</p>
                <h2
                  id="built-for-trade"
                  className="display mt-6 max-w-xl text-4xl font-black leading-[.9] tracking-[-.07em] sm:text-6xl"
                >
                  A WEBSITE THAT WORKS FOR YOUR TRADE.
                </h2>
              </div>
              <div>
                <p className="max-w-2xl text-lg leading-7 text-ink/75">
                  A useful small business website is specific, accurate and easy to navigate. It
                  should help someone understand what you do—not make claims you can’t stand
                  behind.
                </p>
                <div className="mt-8 divide-y divide-ink/25 border-y border-ink">
                  {usefulContent.map((item) => (
                    <article
                      key={item.number}
                      className="grid gap-3 py-5 sm:grid-cols-[4rem_1fr] sm:gap-5 sm:py-6"
                    >
                      <span className="font-mono text-sm font-bold text-signal">
                        {item.number}
                      </span>
                      <div>
                        <h3 className="display text-2xl font-black leading-tight tracking-[-.04em]">
                          {item.title}
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
                          {item.copy}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-signal py-20 lg:py-28" aria-labelledby="choose-size">
          <div className="container">
            <div className="grid gap-8 border-t border-ink/50 pt-5 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="eyebrow">03 / A size to suit the information</p>
                <h2
                  id="choose-size"
                  className="display mt-6 max-w-xl text-4xl font-black leading-[.9] tracking-[-.07em] sm:text-6xl"
                >
                  ONE PAGE OR A MORE COMPLETE WEBSITE?
                </h2>
              </div>
              <div>
                <p className="max-w-2xl text-lg leading-7 text-ink/80">
                  The right structure depends on how much customers need to know about your
                  business and services. Both options are designed to make the essential details
                  clear.
                </p>
                <div className="mt-8 grid gap-3 md:grid-cols-2">
                  <article className="border border-ink bg-paper p-6 sm:p-7">
                    <p className="eyebrow">One page</p>
                    <h3 className="display mt-5 text-3xl font-black leading-none tracking-[-.05em]">
                      Starter Website
                    </h3>
                    <p className="mt-4 text-sm leading-6 text-ink/75">
                      A one-page website containing the essential business information customers
                      need to understand your trade and contact you.
                    </p>
                  </article>
                  <article className="border border-ink bg-ink p-6 text-paper sm:p-7">
                    <p className="eyebrow text-paper/65">3–5 pages</p>
                    <h3 className="display mt-5 text-3xl font-black leading-none tracking-[-.05em]">
                      Complete Website
                    </h3>
                    <p className="mt-4 text-sm leading-6 text-paper/75">
                      More room for separate service information, examples of your work and
                      business details, with clear navigation between them.
                    </p>
                  </article>
                </div>
                <Link
                  className="mt-6 inline-flex min-h-12 items-center border-b-2 border-ink font-mono text-xs font-bold uppercase tracking-wider"
                  href="/#pricing"
                >
                  See current package details and prices
                  <span className="ml-3 text-lg" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-ink py-20 text-paper lg:py-28" aria-labelledby="process">
          <div className="container">
            <div className="grid gap-8 border-t border-paper/30 pt-5 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="eyebrow text-paper/60">04 / A straightforward process</p>
                <h2
                  id="process"
                  className="display mt-6 max-w-xl text-4xl font-black leading-[.9] tracking-[-.07em] sm:text-6xl"
                >
                  YOU KNOW YOUR TRADE. I’LL HANDLE THE WEBSITE.
                </h2>
              </div>
              <div>
                <p className="max-w-2xl text-lg leading-7 text-paper/75">
                  You don’t need technical knowledge or website-building experience. You know the
                  work and customers; I’ll turn the information you provide into a clear website.
                </p>
                <ol className="mt-8 grid gap-px border border-paper/30 bg-paper/30 sm:grid-cols-2">
                  {[
                    {
                      title: "Share the details",
                      copy: "Tell me about your business, the services you provide and the areas you cover.",
                    },
                    {
                      title: "Send your photographs",
                      copy: "Choose genuine project photos you own or have permission to use.",
                    },
                    {
                      title: "I build your website",
                      copy: "I organise the content and build the agreed website for your trade.",
                    },
                    {
                      title: "Review before launch",
                      copy: "You review the first version, share feedback and check the details before it goes live.",
                    },
                  ].map((step, index) => (
                    <li key={step.title} className="bg-ink p-5 sm:p-6">
                      <span className="font-mono text-xs text-signal">
                        0{index + 1}
                      </span>
                      <h3 className="display mt-5 text-2xl font-black leading-tight tracking-[-.04em]">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-paper/70">{step.copy}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-paper py-20 lg:py-28" aria-labelledby="seo-foundation">
          <div className="container grid gap-8 border-t border-ink pt-5 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="eyebrow">05 / Clear foundations, honest expectations</p>
              <h2
                id="seo-foundation"
                className="display mt-6 max-w-xl text-4xl font-black leading-[.9] tracking-[-.07em] sm:text-6xl"
              >
                SEO WITHOUT UNREALISTIC PROMISES.
              </h2>
            </div>
            <div className="max-w-3xl">
              <p className="text-lg leading-7 text-ink/75">
                Basic SEO setup gives search engines useful clues about what your website and
                services are about. It includes descriptive page titles, clear headings, relevant
                service and coverage information, a sitemap and essential indexing setup.
              </p>
              <p className="mt-5 border-l-2 border-signal pl-5 text-base leading-7 text-ink/75">
                These are technical foundations, not a promise of search positions or enquiries.
                Rankings depend on many factors, and no responsible website can guarantee where
                Google will place it.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-clay py-20 lg:py-28" aria-labelledby="trade-faq">
          <div className="container grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-16">
            <div>
              <p className="eyebrow border-t border-ink pt-5">06 / Straight answers</p>
              <h2
                id="trade-faq"
                className="display mt-6 text-4xl font-black leading-[.9] tracking-[-.07em] sm:text-6xl"
              >
                QUESTIONS FROM TRADESPEOPLE.
              </h2>
              <p className="mt-5 max-w-sm leading-7 text-ink/70">
                Practical answers about building a website around the way your business works.
              </p>
            </div>
            <div>
              {faqs.map((faq, index) => (
                <details key={faq.question} className="group border-t border-ink py-5">
                  <summary className="flex cursor-pointer list-none justify-between gap-6 text-base font-bold leading-6 sm:text-lg">
                    <span>
                      <span className="mr-3 font-mono text-xs text-signal">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {faq.question}
                    </span>
                    <span
                      className="mt-1 shrink-0 transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-1 pl-9 pt-4 leading-7 text-ink/75">
                    {faq.answer}
                    {faq.question === "How much does a tradesperson’s website cost?" && (
                      <>
                        {" "}
                        <Link
                          className="font-bold underline decoration-signal underline-offset-4"
                          href="/#pricing"
                        >
                          View the current website packages and prices.
                        </Link>
                      </>
                    )}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-moss py-20 text-paper lg:py-28" aria-labelledby="final-invitation">
          <div className="container">
            <div className="grid gap-8 border-t border-paper/30 pt-5 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:gap-16">
              <div>
                <p className="eyebrow text-paper/65">07 / Start with a conversation</p>
                <h2
                  id="final-invitation"
                  className="display mt-6 max-w-4xl text-5xl font-black leading-[.86] tracking-[-.08em] sm:text-7xl"
                >
                  LET’S TALK ABOUT YOUR TRADE.
                </h2>
              </div>
              <div>
                <p className="max-w-xl text-lg leading-7 text-paper/80">
                  Tell me what you do, the work you want to show and what you need from a website.
                  I’ll help you work out a sensible next step—without pressure to go ahead.
                </p>
                <Link className="button-primary mt-7" href="/#contact">
                  Talk through your website
                  <span className="ml-2 text-lg" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink py-8 text-paper">
        <div className="container flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Link
              href="/"
              className="display text-xl font-black tracking-[-.07em]"
              aria-label="Coded by Curt home"
            >
              CODED <span className="text-signal">BY</span> CURT
            </Link>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-paper/60">
              Websites for UK tradespeople and home-service businesses.
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-paper/60"
            aria-label="Footer navigation"
          >
            <Link className="transition-colors hover:text-paper" href="/">
              Home
            </Link>
            <Link className="transition-colors hover:text-paper" href="/#work">
              Work
            </Link>
            <Link className="transition-colors hover:text-paper" href="/#pricing">
              Pricing
            </Link>
            <Link className="transition-colors hover:text-paper" href="/#contact">
              Get in touch
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
