"use client";

import { Fragment, type FormEvent, type ReactNode, useEffect, useReducer, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Menu, Phone, X } from "lucide-react";
import Image from "next/image";
import { siteConfig, type Project } from "@/lib/site-config";
import {
  enquiryFormReducer,
  getEnquiryIdempotencyKey,
  hasContactMethod,
  initialEnquiryFormState,
  missingContactMethodMessage,
  submitEnquiry,
  type EnquiryField,
  type EnquiryPayload,
} from "@/lib/client/enquiry-submission";
import { DevicePair } from "@/components/project-visual";
import { ProjectScroll } from "@/components/project-scroll";
import { SmoothScroll } from "@/components/smooth-scroll";

const navLinks = [
  { label: "Work", href: "#work" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

const hasConfiguredPhone = Boolean(siteConfig.phoneHref);
const hasConfiguredEmail = Boolean(siteConfig.email);
const hasConfiguredWhatsApp = Boolean(siteConfig.whatsappHref);
const heroTypewriterPhrases = [
  "SHOWCASE YOUR WORK.",
  "BUILD CUSTOMER TRUST.",
  "MAKE ENQUIRIES EASIER.",
  "A CLEAR STARTING POINT. A PRICE AGREED UP FRONT.",
] as const;

function KineticWord({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={`kinetic-word ${className}`} aria-hidden="true">
      {Array.from(text, (character, index) => (
        <span className="kinetic-char" key={`${character}-${index}`}>
          <span className="kinetic-char-sizer" aria-hidden="true">
            {character}
          </span>
          <span className="kinetic-char-glyph">{character}</span>
        </span>
      ))}
    </span>
  );
}

function Wordmark() {
  return (
    <a
      href="#top"
      className="display inline-flex items-baseline text-2xl font-black tracking-[-.08em]"
      aria-label={`${siteConfig.name} home`}
    >
      <KineticWord text="CODED" />
      <KineticWord text="BY" className="text-signal" />
      <KineticWord text="CURT" />
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-ink text-paper">
      <div className="container flex h-20 items-center justify-between border-b border-paper/20">
        <Wordmark />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="eyebrow inline-flex min-h-11 items-center transition-colors hover:text-signal">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden lg:block">
          <a href="#contact" className="button-primary !min-h-11">
            Talk through your website <ArrowRight className="size-4" />
          </a>
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          <a
            href="#contact"
            className="inline-flex min-h-11 items-center font-mono text-[10px] font-bold tracking-tight underline decoration-signal decoration-2 underline-offset-4"
          >
            Get a quote
          </a>
          <button
            type="button"
            className="grid size-11 place-items-center border border-paper/50"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          className="container border-b border-paper/20 bg-ink py-4 text-paper lg:hidden"
          aria-label="Mobile navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="display block border-t border-paper/20 py-4 text-3xl font-black"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="button-primary mt-4 w-full"
          >
            Talk through your website <ArrowRight className="size-4" />
          </a>
        </nav>
      )}
    </header>
  );
}

export function Hero() {
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [typewriterText, setTypewriterText] = useState<string>(
    heroTypewriterPhrases[0],
  );

  useEffect(() => {
    if (reduced !== false) return;

    let phraseIndex = 0;
    let characterIndex = heroTypewriterPhrases[phraseIndex].length;
    let deleting = true;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (deleting) {
        characterIndex -= 1;
        setTypewriterText(
          heroTypewriterPhrases[phraseIndex].slice(0, characterIndex),
        );

        if (characterIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % heroTypewriterPhrases.length;
          timeout = setTimeout(tick, 320);
          return;
        }

        timeout = setTimeout(tick, 42);
        return;
      }

      const phrase = heroTypewriterPhrases[phraseIndex];
      characterIndex += 1;
      setTypewriterText(phrase.slice(0, characterIndex));

      if (characterIndex === phrase.length) {
        deleting = true;
        timeout = setTimeout(tick, 1800);
        return;
      }

      timeout = setTimeout(tick, 76);
    };

    timeout = setTimeout(tick, 2000);
    return () => clearTimeout(timeout);
  }, [reduced]);

  useEffect(() => {
    if (reduced !== false) return;

    const video = videoRef.current;
    if (!video) return;

    // The poster is the hero's complete fallback. Avoid downloading a 4.2 MB
    // decorative video on smaller or data-conscious devices.
    const connection = navigator as Navigator & {
      connection?: { saveData?: boolean };
    };
    if (
      connection.connection?.saveData ||
      window.matchMedia("(max-width: 767px)").matches
    ) {
      return;
    }

    let hasLoaded = false;

    const loadAndPlay = () => {
      if (hasLoaded) return;
      hasLoaded = true;
      video.src = "/portfoliohero.mp4";
      video.load();
      void video.play().catch(() => undefined);
    };

    if (!("IntersectionObserver" in window)) {
      loadAndPlay();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadAndPlay();
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(video);

    return () => {
      observer.disconnect();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [reduced]);

  const renderKineticLine = (text: string, signal = false) => (
    <span
      className={signal ? "hero-kinetic-line text-signal" : "hero-kinetic-line"}
      aria-hidden="true"
    >
      {text.split(" ").map((word, wordIndex, words) => (
        <Fragment key={`${word}-${wordIndex}`}>
          <KineticWord text={word} />
          {wordIndex < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );

  return (
    <section id="top" className="relative isolate overflow-hidden bg-ink text-paper">
      <video
        ref={videoRef}
        className="absolute inset-0 -z-20 size-full object-cover"
        poster="/portfoliohero-poster.jpg"
        loop
        muted
        playsInline
        preload="none"
        aria-hidden="true"
      />
      <div className="absolute inset-0 -z-10 bg-ink/70" aria-hidden="true" />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/85 via-ink/60 to-ink/25"
        aria-hidden="true"
      />
      <div className="container flex min-h-[680px] items-center pb-14 pt-16 lg:min-h-[760px] lg:pb-20">
        <div className="relative z-10 max-w-3xl">
          <motion.p
            className="eyebrow mb-6 flex items-center gap-3"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="size-2 bg-signal" />
            Websites for the people who keep things working
          </motion.p>
          <motion.h1
            className="display max-w-3xl text-[clamp(3.5rem,7.3vw,7rem)] font-black leading-[.86] tracking-[-.08em]"
            aria-label="LOOK THE PART BEFORE THEY CALL."
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            {renderKineticLine("LOOK THE PART")}
            <br />
            {renderKineticLine("BEFORE THEY")}
            <br />
            {renderKineticLine("CALL.", true)}
          </motion.h1>
          <p className="hero-typewriter display mt-5 text-2xl font-bold leading-tight tracking-[-.045em] text-signal sm:text-3xl">
            <span className="sr-only">{heroTypewriterPhrases[0]}</span>
            <span className="grid" aria-hidden="true">
              <span className="invisible col-start-1 row-start-1">
                A CLEAR STARTING POINT. A PRICE AGREED UP FRONT.
              </span>
              <span className="col-start-1 row-start-1">
                {reduced === true ? heroTypewriterPhrases[0] : typewriterText}
                <span className="hero-typewriter-cursor" aria-hidden="true" />
              </span>
            </span>
          </p>
          <motion.p
            className="mt-7 max-w-xl text-base leading-7 text-paper/85 sm:text-lg"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            When a customer hears your name or looks for a local tradesperson, give them a clear
            place to see what you do, where you work and the jobs you’re proud of. Then make it
            straightforward to call or ask for a quote.
          </motion.p>
          <motion.div
            className="mt-7 flex flex-wrap gap-3"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            <a href="#contact" className="button-primary">
              Get a straight-talking quote <ArrowRight className="size-4" />
            </a>
            <a
              href="#work"
              className="button-secondary !border-paper/70 !text-paper hover:!bg-paper hover:!text-ink"
            >
              See selected work <span aria-hidden="true">↓</span>
            </a>
          </motion.div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[.14em] text-paper/70 sm:text-xs">
            No ranking promises. Just a more professional place to send customers.
          </p>
        </div>
      </div>
      <div className="container relative z-10 flex items-center justify-between border-t border-paper/30 py-4 eyebrow">
        <span>Websites for tradespeople and home-service businesses.</span>
        <a className="hidden transition-colors hover:text-signal sm:block" href="#how-it-works">
          A simple process ↓
        </a>
      </div>
    </section>
  );
}

function ScrollTextReveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={reduced === true || isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: 18 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{
        duration: reduced === true ? 0 : 0.72,
        delay: reduced === true ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

function ProjectSection({ project }: { project: Project }) {
  const background =
    project.tone === "moss"
      ? "bg-moss text-paper"
      : project.tone === "orange"
        ? "bg-signal"
        : "bg-clay";
  const isLiveProject = project.location === "Live project";

  return (
    <article className={`${background} border-b border-ink/30 py-16 lg:py-24`}>
      <div className="container grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-16">
        <DevicePair project={project} />
        <div>
          <ScrollTextReveal>
            <div className="flex flex-wrap items-center gap-3 eyebrow">
              <span className="inline-grid size-7 place-items-center border border-current">
                {project.number}
              </span>
              {project.trade} <span aria-hidden="true">·</span> {project.location}
            </div>
          </ScrollTextReveal>
          <ScrollTextReveal delay={0.1}>
            <h2 className="display mt-7 text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-7xl">
              {project.name}
            </h2>
          </ScrollTextReveal>
          <ScrollTextReveal delay={0.2}>
            <dl className="mt-8 space-y-5 border-t border-current/50 pt-5">
              <div>
                <dt className={`eyebrow ${project.tone === "moss" ? "text-paper/80" : "text-ink"}`}>The customer’s challenge</dt>
                <dd className="mt-2 text-base leading-7 sm:text-lg">{project.problem}</dd>
              </div>
              <div>
                <dt className={`eyebrow ${project.tone === "moss" ? "text-paper/80" : "text-ink"}`}>The approach</dt>
                <dd className="mt-2 text-base leading-7 sm:text-lg">{project.built}</dd>
              </div>
              <div>
                <dt className={`eyebrow ${project.tone === "moss" ? "text-paper/80" : "text-ink"}`}>What the site makes easier</dt>
                <dd className="mt-2 text-base leading-7 sm:text-lg">{project.result}</dd>
              </div>
            </dl>
          </ScrollTextReveal>
          <ul className="mt-7 grid gap-2 border-t border-current/50 pt-5 text-sm">
            {project.features.map((feature) => (
              <li key={feature} className="flex gap-3">
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
          {isLiveProject ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Visit ${project.name} live website (opens in a new tab)`}
              className="mt-7 inline-flex items-center gap-2 border-b border-current pb-1 font-mono text-xs font-bold uppercase tracking-wider"
            >
              Visit the live website <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          ) : (
            <a
              href="#contact"
              className="mt-7 inline-flex items-center gap-2 border-b border-current pb-1 font-mono text-xs font-bold uppercase tracking-wider"
            >
              Discuss a site like this <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function Marquee() {
  const trades = [
    "Plumbers",
    "Electricians",
    "Plasterers",
    "Roofers",
    "Builders",
    "Bricklayers",
    "Landscapers",
    "Other home-service businesses",
  ];

  return (
    <section aria-label="Trades served" className="overflow-hidden border-y border-ink bg-ink py-5 text-paper">
      <p className="sr-only">
        Websites for tradespeople and home-service businesses, including {trades.join(", ")}.
      </p>
      <div className="marquee-track display flex w-max gap-8 whitespace-nowrap text-3xl font-black tracking-[-.06em] sm:text-4xl" aria-hidden="true">
        {[...trades, ...trades, ...trades].map((trade, index) => (
          <span key={`${trade}-${index}`}>
            {trade} <i className="not-italic text-signal">·</i>
          </span>
        ))}
      </div>
    </section>
  );
}

function WhatYouGet() {
  const benefits = [
    {
      number: "01",
      title: "Make the next step obvious",
      copy: "Put a tap-to-call number and quote request where people can find them—especially on a phone.",
      style: "bg-signal lg:col-span-7",
    },
    {
      number: "02",
      title: "Explain what you do",
      copy: "Set out your services and coverage in plain English, so the right people can tell if you take on their job.",
      style: "bg-paper lg:col-span-5",
    },
    {
      number: "03",
      title: "Show the standard of your work",
      copy: "Use real project photos and genuine customer reviews to help visitors get a feel for your work.",
      style: "bg-moss text-paper lg:col-span-5",
    },
    {
      number: "04",
      title: "Back up the recommendation",
      copy: "Word of mouth still matters. A professional site gives people somewhere useful to look after they hear your name.",
      style: "bg-clay lg:col-span-7",
    },
  ];

  return (
    <section className="bg-paper py-20 lg:py-28">
      <div className="container">
        <div className="grid gap-8 border-t border-ink pt-5 lg:grid-cols-2">
          <div>
            <p className="eyebrow">01 / Why a website</p>
            <h2 className="display mt-6 max-w-xl text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-7xl">
              GOOD WORK DESERVES A GOOD FIRST IMPRESSION.
            </h2>
          </div>
          <p className="max-w-lg self-end text-lg leading-7 text-ink/75">
            A website doesn’t replace Facebook, recommendations or repeat customers. It gives
            people one professional place to check your services, see your work and decide how to
            get in touch.
          </p>
        </div>
        <div className="mt-12 grid gap-3 lg:grid-cols-12">
          {benefits.map((benefit) => (
            <article
              key={benefit.number}
              className={`min-h-64 border border-ink p-6 sm:p-8 ${benefit.style}`}
            >
              <p className="eyebrow">{benefit.number} / What it does</p>
              <h3 className="display mt-10 max-w-lg text-4xl font-black leading-[.9] tracking-[-.06em] sm:text-5xl">
                {benefit.title}
              </h3>
              <p className="mt-4 max-w-lg leading-7">{benefit.copy}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-5 border-b border-ink/30 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-6 text-ink/70">
            Keep the channels that already work for you. Your website gives them a useful place to
            point potential customers.
          </p>
          <a href="#pricing" className="button-secondary self-start sm:self-auto">
            Compare starting points <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Process() {
  const advantages = [
    {
      title: "I build it for you.",
      copy: "No spending your evenings trying to put a website together.",
    },
    {
      title: "No technical experience needed.",
      copy: "No complicated software or website-building skills required.",
    },
    {
      title: "Built around your trade.",
      copy: "Your services, your work, your coverage areas and your customers.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Tell me about the work",
      copy: "Share your trade, service area and the customers you want to reach.",
    },
    {
      number: "02",
      title: "Agree the right scope",
      copy: "We’ll agree the pages and details that fit your business, and what the project costs.",
    },
    {
      number: "03",
      title: "Review the first version",
      copy: "Check the wording, photos and contact details together, and share any feedback.",
    },
    {
      number: "04",
      title: "Get ready to launch",
      copy: "We’ll sort your feedback and agree the next steps before the site goes live.",
    },
  ];

  return (
    <section id="how-it-works" className="scroll-target bg-ink py-20 text-paper lg:py-28">
      <div className="container">
        <div className="grid gap-8 border-t border-paper/50 pt-5 lg:grid-cols-2">
          <div>
            <p className="eyebrow">02 / How it works</p>
            <h2 className="display mt-6 max-w-2xl text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-7xl">
              YOU KNOW YOUR TRADE. I’LL HANDLE THE WEBSITE.
            </h2>
          </div>
          <div className="max-w-lg self-end space-y-4 text-lg leading-7 text-paper/75">
            <p>
              You could spend hours trying to build a website yourself, learning new tools and
              figuring out what goes where. Or you can leave the website development to me.
            </p>
            <p>
              I build websites around your business, the services you offer and the customers you
              want to reach. You provide the trade knowledge, photos and feedback. I’ll handle the
              design, development and technical side.
            </p>
          </div>
        </div>
        <div className="mt-8 grid gap-px border border-paper/30 bg-paper/30 sm:grid-cols-3">
          {advantages.map((advantage) => (
            <article key={advantage.title} className="bg-ink p-5 sm:p-6">
              <h3 className="display text-2xl font-black leading-[.95] tracking-[-.04em]">
                {advantage.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-paper/70">{advantage.copy}</p>
            </article>
          ))}
        </div>
        <ol className="mt-12 grid gap-px border border-paper/30 bg-paper/30 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.number} className="min-h-64 bg-ink p-6 sm:p-7">
              <span className="font-mono text-xs text-signal">{step.number}</span>
              <h3 className="display mt-10 text-3xl font-black leading-[.92] tracking-[-.055em]">
                {step.title}
              </h3>
              <p className="mt-4 text-sm leading-6 text-paper/70">{step.copy}</p>
            </li>
          ))}
        </ol>
        <a href="#contact" className="button-primary mt-8">
          Talk through your project <ArrowRight className="size-4" />
        </a>
      </div>
    </section>
  );
}

function Pricing() {
  const addOns = [
    {
      name: "Facebook and Instagram setup",
      price: "£40",
      description:
        "Set up a Facebook business page and an Instagram professional account for your trade.",
    },
    {
      name: "Google Business Profile setup",
      price: "£40",
      description:
        "Help customers find your business on Google Search and Google Maps with a properly set-up profile.",
    },
    {
      name: "Meta Ads setup",
      price: "£70",
      description:
        "Configure your advertising accounts and set up an initial campaign. Ad spend and ongoing management are separate.",
    },
    {
      name: "QR-code Google review materials",
      price: "£15",
      description:
        "Get a QR code and review-request design customers can scan to reach your Google review link. Printing costs extra.",
    },
    {
      name: "Business card design",
      price: "£30",
      description:
        "A business card design with your contact details, ready to send to a printer. Printing costs extra.",
    },
  ];

  const packages = [
    {
      name: "Online Presence Package",
      price: "£70",
      regularPrice: "£80",
      saving: "£10",
      details: [
        "Facebook business page setup",
        "Instagram professional account setup",
        "Google Business Profile setup",
      ],
    },
    {
      name: "Business Visibility Package",
      price: "£169",
      regularPrice: "£195",
      saving: "£26",
      details: [
        "Everything in Online Presence",
        "Meta Ads account and initial campaign setup",
        "QR-code Google review materials",
        "Business card design",
      ],
    },
  ];

  const bundles = [
    {
      name: "Starter Website + Online Presence",
      price: "£325",
      regularPrice: "£340",
      saving: "£15",
      includes: "Starter Website and Online Presence Package",
    },
    {
      name: "Complete Website + Business Visibility",
      price: "£539",
      regularPrice: "£569",
      saving: "£30",
      includes: "Complete Website and Business Visibility Package",
    },
  ];

  return (
    <section id="pricing" className="scroll-target bg-clay py-20 lg:py-28">
      <div className="container">
        <div className="grid gap-8 border-t border-ink pt-5 lg:grid-cols-[1fr_.8fr]">
          <div>
            <p className="eyebrow">03 / Pricing & scope</p>
            <h2 className="display mt-6 max-w-2xl text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-7xl">
              WEBSITES AND SERVICES. CLEAR PRICES UP FRONT.
            </h2>
          </div>
          <div className="self-end">
            <p className="text-lg leading-7 text-ink/75">
              Choose a website package, add useful digital services, or combine them in a bundle.
              We’ll agree the scope and price before any work begins.
            </p>
          </div>
        </div>
        <div className="mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-3">
            <div>
              <p className="eyebrow">01 / Website packages</p>
              <h3 className="display mt-2 text-3xl font-black leading-none tracking-[-.05em] sm:text-4xl">
                Pick the right size for your business.
              </h3>
            </div>
            <p className="max-w-md text-sm leading-6 text-ink/70">
              Both packages are built for mobile and include a basic SEO setup.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <article
              className="flex flex-col border border-ink bg-paper p-6 sm:p-8"
            >
              <p className="eyebrow">One-page website</p>
              <h4 className="display mt-5 text-3xl font-black leading-[.92] tracking-[-.055em]">
                Starter Website
              </h4>
              <p className="mt-4 font-mono text-3xl font-bold tracking-tight">£270</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink/60">
                One-off
              </p>
              <p className="mt-4 text-sm leading-6 text-ink/75">
                One page containing the essential information customers need to understand your
                business and contact you.
              </p>
              <ul className="mt-6 grid gap-3 border-t border-ink/25 pt-5 text-sm leading-6">
                {[
                  "Business introduction and services",
                  "Areas you cover",
                  "Work gallery",
                  "Contact details and enquiry options",
                  "Mobile-friendly design",
                  "Basic SEO setup",
                ].map((detail) => (
                  <li key={detail} className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0" aria-hidden="true" />
                    {detail}
                  </li>
                ))}
              </ul>
              <a
                href="#package-deals"
                className="mt-6 block border border-ink/25 bg-clay/60 p-4 transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1"
              >
                <span className="eyebrow">Add Online Presence</span>
                <span className="mt-2 block text-sm leading-5">
                  Get the Online Presence Package for £55 instead of £70 when purchased with this
                  website.
                </span>
                <span className="mt-3 block font-mono text-xs font-bold uppercase tracking-wide">
                  Combined price: £325. Save £15.
                </span>
              </a>
              <a
                href="#contact"
                className="mt-auto inline-flex items-center gap-2 pt-8 font-mono text-xs font-bold uppercase tracking-wider underline decoration-1 underline-offset-4"
              >
                Ask about Starter <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </article>
            <article className="grid gap-6 border border-ink bg-signal p-6 sm:p-8 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="eyebrow">3–5 page website</p>
                  <span className="border border-ink px-2 py-1 font-mono text-[9px] uppercase tracking-wider">
                    Recommended
                  </span>
                </div>
                <h4 className="display mt-5 text-3xl font-black leading-[.92] tracking-[-.055em]">
                  Complete Website
                </h4>
                <p className="mt-4 font-mono text-3xl font-bold tracking-tight">£400</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink/60">
                  One-off
                </p>
                <p className="mt-4 text-sm leading-6 text-ink/75">
                  A more developed website with separate pages for your services, business and
                  previous work. Give customers more detail, make navigation easier and create more
                  opportunities for relevant search content.
                </p>
                <ul className="mt-6 grid gap-3 border-t border-ink/25 pt-5 text-sm leading-6">
                  {[
                    "Everything in Starter",
                    "Separate service pages with more detailed information",
                    "Dedicated gallery or previous work page",
                    "About page",
                    "Dedicated contact and enquiry page",
                    "More opportunities to target relevant services and locations through Google",
                  ].map((detail) => (
                    <li key={detail} className="flex gap-3">
                      <Check className="mt-1 size-4 shrink-0" aria-hidden="true" />
                      {detail}
                    </li>
                  ))}
                </ul>
                <a
                  href="#package-deals"
                  className="mt-6 block border border-ink/25 bg-paper/75 p-4 transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1"
                >
                  <span className="eyebrow">Add Business Visibility</span>
                  <span className="mt-2 block text-sm leading-5">
                    Get the Business Visibility Package for £139 instead of £169 when purchased
                    with this website.
                  </span>
                  <span className="mt-3 block font-mono text-xs font-bold uppercase tracking-wide">
                    Combined price: £539. Save £30.
                  </span>
                </a>
                <a
                  href="#contact"
                  className="mt-8 inline-flex items-center gap-2 pt-2 font-mono text-xs font-bold uppercase tracking-wider underline decoration-1 underline-offset-4"
                >
                  Ask about Complete <ArrowRight className="size-4" aria-hidden="true" />
                </a>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-[280px] lg:max-w-none" aria-hidden="true">
                <picture className="block size-full">
                  <source
                    media="(prefers-reduced-motion: reduce)"
                    srcSet="/animations/study-discussion-static.svg"
                  />
                  <Image
                    src="/animations/study-discussion.svg"
                    alt=""
                    width={1200}
                    height={1200}
                    unoptimized
                    sizes="(max-width: 1023px) 70vw, 25vw"
                    className="size-full object-contain"
                  />
                </picture>
              </div>
            </article>
          </div>
        </div>

        <div id="package-deals" className="mt-16 scroll-target">
          <div className="mb-5 border-b border-ink pb-3">
            <p className="eyebrow">03 / Package deals</p>
            <h3 className="display mt-2 text-3xl font-black leading-none tracking-[-.05em] sm:text-4xl">
              Useful services, bundled for less.
            </h3>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {packages.map((bundle) => (
              <article key={bundle.name} className="flex flex-col border border-ink bg-paper p-6 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h4 className="display text-2xl font-black leading-tight tracking-[-.04em]">
                      {bundle.name}
                    </h4>
                    <p className="mt-3 font-mono text-2xl font-bold">{bundle.price}</p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink/65">
                      Normally {bundle.regularPrice} · Save {bundle.saving}
                    </p>
                  </div>
                  <span className="border border-ink px-2 py-1 font-mono text-[9px] uppercase tracking-wider">
                    One-off
                  </span>
                </div>
                <ul className="mt-6 grid gap-3 border-t border-ink/25 pt-5 text-sm leading-6">
                  {bundle.details.map((detail) => (
                    <li key={detail} className="flex gap-3">
                      <Check className="mt-1 size-4 shrink-0" aria-hidden="true" />
                      {detail}
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className="mt-auto inline-flex items-center gap-2 pt-8 font-mono text-xs font-bold uppercase tracking-wider underline decoration-1 underline-offset-4"
                >
                  Ask about this package <ArrowRight className="size-4" aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-ink/65">
            Business Visibility also excludes advertising spend and printing costs.
          </p>
        </div>

        <div className="mt-16">
          <div className="mb-5 border-b border-ink pb-3">
            <p className="eyebrow">02 / Individual add-ons</p>
            <h3 className="display mt-2 text-3xl font-black leading-none tracking-[-.05em] sm:text-4xl">
              Add what’s useful.
            </h3>
          </div>
          <div className="grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-3">
            {addOns.map((service) => (
              <article key={service.name} className="flex flex-col bg-paper p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <h4 className="font-bold leading-6">{service.name}</h4>
                  <p className="shrink-0 font-mono text-sm font-bold">{service.price}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink/70">{service.description}</p>
              </article>
            ))}
            <a
              href="#contact"
              className="group flex min-h-full flex-col justify-between bg-ink p-5 text-paper transition-colors hover:bg-moss focus-visible:outline-paper sm:p-6"
            >
              <div>
                <h4 className="eyebrow text-paper">Not sure what you need?</h4>
                <p className="mt-4 text-sm leading-6 text-paper/75">
                  Tell me a little about your business and I&apos;ll help you work out which
                  services would be useful.
                </p>
              </div>
              <span className="mt-8 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-paper underline decoration-signal decoration-2 underline-offset-4">
                Let&apos;s talk{" "}
                <ArrowRight
                  className="size-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </a>
          </div>
          <p className="mt-3 text-xs leading-5 text-ink/65">
            One-off setup prices. Advertising spend, printing and paid third-party services are
            not included.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div className="border border-ink bg-signal p-6 sm:p-8">
            <p className="eyebrow">04 / Ongoing support</p>
            <h3 className="display mt-4 text-3xl font-black leading-[.95] tracking-[-.05em]">
              Website Care &amp; Support
            </h3>
            <p className="mt-4 font-mono text-3xl font-bold">£29/month</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider">Recurring</p>
          </div>
          <div className="border border-ink bg-paper p-6 sm:p-8">
            <p className="eyebrow">A hand when you need it</p>
            <ul className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-2">
              {[
                "Basic website maintenance and checks",
                "Contact form checks",
                "Up to 30 minutes of small text and photo updates each month",
                "Domain and website technical assistance",
                "General website support",
              ].map((detail) => (
                <li key={detail} className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0" aria-hidden="true" />
                  {detail}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-ink/25 pt-4 text-xs leading-5 text-ink/70">
              Domain registration and renewals, paid third-party services and larger changes may
              cost extra. This plan doesn’t include unlimited changes or support.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <div className="mb-5 border-b border-ink pb-3">
            <p className="eyebrow">05 / Website + digital presence</p>
            <h3 className="display mt-2 text-3xl font-black leading-none tracking-[-.05em] sm:text-4xl">
              A website and the tools around it.
            </h3>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {bundles.map((bundle) => (
              <article key={bundle.name} className="flex flex-col border border-ink bg-ink p-6 text-paper sm:p-7">
                <p className="eyebrow text-paper/65">One-off bundle</p>
                <h4 className="display mt-4 text-2xl font-black leading-tight tracking-[-.04em]">
                  {bundle.name}
                </h4>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-mono text-3xl font-bold text-signal">{bundle.price}</p>
                  <p className="font-mono text-xs text-paper/65">
                    Normally {bundle.regularPrice} · Save {bundle.saving}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-paper/75">
                  Includes {bundle.includes}.
                </p>
                <a
                  href="#contact"
                  className="mt-auto inline-flex items-center gap-2 pt-7 font-mono text-xs font-bold uppercase tracking-wider underline decoration-signal decoration-2 underline-offset-4"
                >
                  Ask about this bundle <ArrowRight className="size-4" aria-hidden="true" />
                </a>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-ink/65">
            The Starter bundle saves £15 compared with separate prices; the Complete bundle saves
            £30. Bundle totals exclude advertising spend and printing costs.
          </p>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const additionalFaqs = [
    {
      question: "Websites sound expensive. What does the price cover?",
      answer:
        "A one-page Starter Website is £270, and a 3–5 page Complete Website is £400. I’ll explain what’s included and any additional costs before work begins, so you can decide without pressure.",
    },
    {
      question: "I don’t have time to manage a website.",
      answer:
        "The site is built around the information customers need, not another stream of posts. We’ll agree what should be on it before launch. If you want help with changes afterwards, we can discuss a support arrangement.",
    },
    {
      question: "I don’t know anything about websites. Is that a problem?",
      answer:
        "Not at all. You know your trade and your customers; I’ll explain the choices in plain English and handle the build. You can review the content and ask questions before anything goes live.",
    },
    {
      question: "What does basic SEO setup mean?",
      answer:
        "Basic SEO setup helps search engines understand what your website and services are about. This includes descriptive page titles and descriptions, clear page headings, relevant service and location information, a sitemap and essential indexing setup. It provides a technical SEO foundation but does not guarantee Google rankings or specific search positions.",
    },
  ];
  const faqs = [...siteConfig.faqs, ...additionalFaqs];

  return (
    <section id="faq" className="scroll-target bg-paper py-20 lg:py-28">
      <div className="container grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-16">
        <div>
          <p className="eyebrow border-t border-ink pt-5">04 / Straight answers</p>
          <h2 className="display mt-6 text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-6xl">
            THE QUESTIONS YOU’RE PROBABLY THINKING.
          </h2>
          <p className="mt-5 max-w-sm leading-7 text-ink/70">
            No pressure and no promise of overnight results. Just clear answers about what a site
            can—and can’t—do for your business.
          </p>
        </div>
        <div>
          {faqs.map((faq, index) => (
            <details key={faq.question} className="group border-t border-ink py-5">
            <summary className="flex cursor-pointer list-none justify-between gap-6 rounded-sm text-base font-bold leading-6 sm:text-lg">
                <span>
                  <span className="mr-3 font-mono text-xs text-[#a03416]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {faq.question}
                </span>
                <ChevronDown
                  className="mt-1 size-5 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="max-w-2xl pb-1 pl-9 pt-4 leading-7 text-ink/75">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="bg-paper pb-20 lg:pb-28">
      <div className="container grid gap-10 border-t border-ink pt-5 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="eyebrow">05 / A straightforward partner</p>
          <h2 className="display mt-6 max-w-xl text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-6xl">
            YOUR WEBSITE SHOULD WORK AS HARD AS YOU DO.
          </h2>
        </div>
        <div>
          <div className="grid min-h-64 gap-5 border border-ink bg-moss p-6 text-paper sm:grid-cols-2 sm:p-8">
            <div className="flex flex-col justify-between border-b border-paper/30 pb-5 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-5">
              <span className="eyebrow text-paper/60">The focus</span>
              <p className="display mt-8 text-3xl font-bold leading-[.95] tracking-[-.04em]">
                Your trade.
                <br />
                Your customers.
              </p>
            </div>
            <div className="flex flex-col justify-between sm:pl-1">
              <span className="eyebrow text-paper/60">The approach</span>
              <p className="display mt-8 text-3xl font-bold leading-[.95] tracking-[-.04em]">
                Clear advice.
                <br />
                No web jargon.
              </p>
            </div>
          </div>
          <p className="mt-7 max-w-xl text-lg leading-7">{siteConfig.about.copy}</p>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  const [formState, dispatch] = useReducer(
    enquiryFormReducer,
    initialEnquiryFormState,
  );
  const submitting = useRef(false);
  const idempotencyKeys = useRef(new Map<string, string>());
  const focusField = (form: HTMLFormElement, field: EnquiryField) => {
    const element = form.elements.namedItem(field);
    if (element instanceof HTMLElement) element.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const payload: EnquiryPayload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      message: String(data.get("message") ?? ""),
    };
    if (!hasContactMethod(payload)) {
      dispatch({
        type: "validation-error",
        fieldErrors: {
          email: missingContactMethodMessage,
        },
      });
      focusField(form, "email");
      return;
    }

    let idempotencyKey: string;
    try {
      idempotencyKey = getEnquiryIdempotencyKey(
        payload,
        idempotencyKeys.current,
      );
    } catch {
      dispatch({
        type: "error",
        message: "We couldn’t prepare your enquiry. Please try again.",
      });
      return;
    }

    submitting.current = true;
    dispatch({ type: "submitting" });
    try {
      const result = await submitEnquiry(payload, idempotencyKey);
      if (result.type === "accepted") {
        form.reset();
        idempotencyKeys.current.clear();
        dispatch({ type: "success" });
      } else if (result.type === "validation-error") {
        dispatch({
          type: "validation-error",
          fieldErrors: result.fieldErrors,
        });
        const firstInvalidField = (
          ["name", "email", "phone", "message"] as const
        ).find((field) => result.fieldErrors[field]);
        if (firstInvalidField) {
          focusField(form, firstInvalidField);
        }
      } else {
        dispatch({
          type: "error",
          message:
            "We couldn’t send your enquiry. Your details are still here—please try again.",
        });
      }
    } finally {
      submitting.current = false;
    }
  };

  const fieldError = (field: EnquiryField) => formState.fieldErrors[field];
  const onFieldChange = (field: EnquiryField) => () =>
    dispatch({ type: "field-changed", field });

  return (
    <section id="contact" className="scroll-target bg-signal py-20 lg:py-28">
      <div className="container grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
        <div>
          <p className="eyebrow border-t border-ink/50 pt-5">06 / Start a conversation</p>
          <h2 className="display mt-6 text-5xl font-black leading-[.86] tracking-[-.08em] sm:text-7xl">
            LET’S MAKE IT EASIER TO CHOOSE YOU.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-7">
            Tell me a little about your trade and what you need. I’ll come back with a clear
            recommendation and a quote—no pressure to go ahead.
          </p>
          <div className="mt-8 space-y-3 font-mono text-sm font-bold">
            {hasConfiguredPhone && (
              <a
                className="flex items-center gap-3 underline decoration-1 underline-offset-4"
                href={`tel:${siteConfig.phoneHref}`}
              >
                <Phone className="size-4" aria-hidden="true" /> {siteConfig.phone}
              </a>
            )}
            {hasConfiguredWhatsApp && (
              <a
                className="flex items-center gap-3 underline decoration-1 underline-offset-4"
                href={siteConfig.whatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                <ArrowUpRight className="size-4" aria-hidden="true" /> Message on WhatsApp
              </a>
            )}
            {hasConfiguredEmail && (
              <a
                className="flex items-center gap-3 underline decoration-1 underline-offset-4"
                href={`mailto:${siteConfig.email}`}
              >
                {siteConfig.email}
              </a>
            )}
          </div>
        </div>
        <form className="border border-ink bg-paper p-5 sm:p-8" onSubmit={submit}>
          <p className="eyebrow mb-6">A few details to get started</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="eyebrow grid gap-2">
              <span className="flex min-h-[2.4em] flex-col justify-between">
                <span>Your name</span>
                <span className="font-sans text-xs font-normal normal-case tracking-normal">
                  Required
                </span>
              </span>
              <input
                required
                name="name"
                autoComplete="name"
                aria-invalid={Boolean(fieldError("name"))}
                aria-describedby={fieldError("name") ? "contact-name-error" : undefined}
                onChange={onFieldChange("name")}
                className="h-12 border border-ink bg-paper px-3 font-sans text-base normal-case tracking-normal"
              />
              {fieldError("name") && (
                <span id="contact-name-error" className="font-sans text-sm normal-case tracking-normal" role="alert">
                  {fieldError("name")}
                </span>
              )}
            </label>
            <label className="eyebrow grid gap-2">
              <span className="flex min-h-[2.4em] flex-col justify-between">
                <span>Phone number</span>
                <span className="font-sans text-xs font-normal normal-case tracking-normal">
                  Optional if you provide an email address.
                </span>
              </span>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={Boolean(fieldError("phone"))}
                aria-describedby={fieldError("phone") ? "contact-phone-error" : undefined}
                onChange={onFieldChange("phone")}
                className="h-12 border border-ink bg-paper px-3 font-sans text-base normal-case tracking-normal"
              />
              {fieldError("phone") && (
                <span id="contact-phone-error" className="font-sans text-sm normal-case tracking-normal" role="alert">
                  {fieldError("phone")}
                </span>
              )}
            </label>
            <label className="eyebrow grid gap-2 sm:col-span-2">
              <span>Email address</span>
              <span className="font-sans text-xs font-normal normal-case tracking-normal">
                Optional if you provide a phone number.
              </span>
              <input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                aria-invalid={Boolean(fieldError("email"))}
                aria-describedby={fieldError("email") ? "contact-email-error" : undefined}
                onChange={onFieldChange("email")}
                className="h-12 border border-ink bg-paper px-3 font-sans text-base normal-case tracking-normal"
              />
              {fieldError("email") && (
                <span id="contact-email-error" className="font-sans text-sm normal-case tracking-normal" role="alert">
                  {fieldError("email")}
                </span>
              )}
            </label>
            <label className="eyebrow grid gap-2 sm:col-span-2">
              Your trade, service area and the work you want more of
              <textarea
                required
                name="message"
                rows={4}
                aria-invalid={Boolean(fieldError("message"))}
                aria-describedby={fieldError("message") ? "contact-message-error" : undefined}
                onChange={onFieldChange("message")}
                className="resize-y border border-ink bg-paper p-3 font-sans text-base normal-case tracking-normal"
                placeholder="For example: plumbing in Leeds, mainly bathroom installs."
              />
              {fieldError("message") && (
                <span id="contact-message-error" className="font-sans text-sm normal-case tracking-normal" role="alert">
                  {fieldError("message")}
                </span>
              )}
            </label>
          </div>
          <button
            className="button-primary mt-6 w-full"
            type="submit"
            disabled={formState.phase === "submitting"}
            aria-busy={formState.phase === "submitting"}
          >
            {formState.phase === "submitting" ? "Sending…" : "Send my enquiry"}
            {formState.phase === "submitting" ? (
              <span
                className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                aria-hidden="true"
              />
            ) : (
              <ArrowRight className="size-4" aria-hidden="true" />
            )}
          </button>
          <p
            className="mt-4 min-h-5 text-sm leading-6"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {formState.message}
          </p>
        </form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink py-8 text-paper">
      <div className="container flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Wordmark />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-paper/60">
            Practical websites for local trades.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-paper/60">
          <a className="inline-flex min-h-8 items-center transition-colors hover:text-paper" href="#work">Work</a>
          <a className="inline-flex min-h-8 items-center transition-colors hover:text-paper" href="#pricing">Pricing</a>
          <Link className="inline-flex min-h-8 items-center transition-colors hover:text-paper" href="/websites-for-tradespeople">Trade websites</Link>
          <a className="inline-flex min-h-8 items-center transition-colors hover:text-paper" href="#contact">Get in touch</a>
          <span>© 2026 {siteConfig.name}</span>
        </div>
      </div>
    </footer>
  );
}

export function HomePage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: siteConfig.businessName,
    description: siteConfig.description,
    url: siteConfig.url,
    ...(hasConfiguredEmail ? { email: siteConfig.email } : {}),
    ...(hasConfiguredPhone ? { telephone: siteConfig.phone } : {}),
    areaServed: { "@type": "Country", name: siteConfig.serviceArea },
    serviceType: "Website design and development for tradespeople and small businesses",
  };

  return (
    <>
      <SmoothScroll />
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <ProjectScroll />
        <section id="work" className="scroll-target">
          <div className="container py-8 sm:py-10">
            <ScrollTextReveal>
              <p className="eyebrow">Selected work / One live project, two concepts</p>
            </ScrollTextReveal>
            <ScrollTextReveal delay={0.12}>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
                The plastering site is a live client project. The electrical and roofing examples
                are concepts—not client results or live businesses.
              </p>
            </ScrollTextReveal>
          </div>
          {siteConfig.projects.map((project) => (
            <ProjectSection project={project} key={project.name} />
          ))}
        </section>
        <Marquee />
        <WhatYouGet />
        <Process />
        <Pricing />
        <FAQ />
        <About />
        <Contact />
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </>
  );
}
