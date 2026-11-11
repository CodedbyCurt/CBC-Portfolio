"use client";

import { Fragment, type FormEvent, type ReactNode, useEffect, useReducer, useRef, useState } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
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
import { openCookieSettings } from "@/components/cookie-consent";
import { trackGenerateLead } from "@/lib/client/analytics";

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
  "LOOK THE PART.",
  "MAKE IT EASY TO CHOOSE YOU.",
  "PROFESSIONAL WEBSITES.",
  "BUILT AROUND YOUR BUSINESS.",
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
        poster="/portfoliohero-poster.avif"
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
            Professional websites for tradespeople and small businesses.
          </motion.p>
          <motion.h1
            className="display max-w-3xl text-[clamp(3.5rem,7.3vw,7rem)] font-black leading-[.86] tracking-[-.08em]"
            aria-label="LOOK THE PART. MAKE IT EASY TO CHOOSE YOU."
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            {renderKineticLine("LOOK THE PART.")}
            <br />
            {renderKineticLine("MAKE IT EASY")}
            <br />
            {renderKineticLine("TO CHOOSE YOU.", true)}
          </motion.h1>
          <p className="hero-typewriter display mt-5 text-2xl font-bold leading-tight tracking-[-.045em] text-signal sm:text-3xl">
            <span className="sr-only">{heroTypewriterPhrases[0]}</span>
            <span className="grid" aria-hidden="true">
              <span className="invisible col-start-1 row-start-1">
                LOOK THE PART.
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
            When someone hears your name, sees your work or searches for a tradesperson, your
            website gives them somewhere to find out more. Show what you do, build confidence in
            your business and make getting in touch straightforward.
          </motion.p>
          <motion.div
            className="mt-7 flex flex-wrap gap-3"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            <a href="#contact" className="button-primary">
              Get a website quote <ArrowRight className="size-4" />
            </a>
            <a
              href="#work"
              className="button-secondary !border-paper/70 !text-paper hover:!bg-paper hover:!text-ink"
            >
              See the work <span aria-hidden="true">↓</span>
            </a>
          </motion.div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[.14em] text-paper/70 sm:text-xs">
            No complicated process. No confusing web jargon. Just a professional website built around your business.
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
  const isLiveProject = project.location.startsWith("Live project");

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
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Visit ${project.name} live website (opens in a new tab)`}
              className="mt-7 inline-flex items-center gap-2 border-b border-current pb-1 font-mono text-xs font-bold uppercase tracking-wider"
            >
              Visit the live website <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          ) : !isLiveProject ? (
            <a
              href="#contact"
              className="mt-7 inline-flex items-center gap-2 border-b border-current pb-1 font-mono text-xs font-bold uppercase tracking-wider"
            >
              Discuss a site like this <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          ) : null}
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

type WebsiteBenefit = {
  number: string;
  label: string;
  title: string;
  copy: string;
  style: string;
};

type WebsiteStep = {
  number: string;
  title: string;
  copy: string;
};

function ProcessPeelCard({
  step,
  index,
  total,
  progress,
}: {
  step: WebsiteStep;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const isLast = index === total - 1;
  const settleAt = index === 0 ? 0.001 : index * 0.2;
  const peelStart = 0.2 + index * 0.22;
  const peelEnd = peelStart + 0.18;
  const direction = index % 2 === 0 ? -1 : 1;
  const initialOffset = `${index * 3.2}vh`;
  const initialX = index === 0 ? "0vw" : index % 2 ? "3vw" : "-3vw";
  const rotation = -1.4 + index;
  const range = isLast
    ? [0, settleAt, 1]
    : [0, settleAt, peelStart, peelEnd, 1];

  const y = useTransform(
    progress,
    range,
    isLast
      ? [initialOffset, "0vh", "0vh"]
      : [initialOffset, "0vh", "0vh", "116vh", "116vh"],
  );
  const x = useTransform(
    progress,
    range,
    isLast
      ? [initialX, "0vw", "0vw"]
      : [initialX, "0vw", "0vw", `${direction * 17}vw`, `${direction * 17}vw`],
  );
  const rotate = useTransform(
    progress,
    range,
    isLast
      ? [`${rotation}deg`, "0deg", "0deg"]
      : [`${rotation}deg`, "0deg", "0deg", `${direction * 10}deg`, `${direction * 10}deg`],
  );
  const scale = useTransform(
    progress,
    range,
    isLast
      ? [1 - index * 0.04, 1, 1]
      : [1 - index * 0.04, 1, 1, 0.9, 0.9],
  );
  const opacity = useTransform(
    progress,
    isLast ? [0, settleAt, 1] : [0, peelEnd - 0.04, peelEnd, 1],
    isLast ? [1, 1, 1] : [1, 1, 0, 0],
  );
  const contentOpacity = useTransform(
    progress,
    index === 0 ? [0, peelEnd - 0.04, peelEnd, 1] : [0, settleAt - 0.04, settleAt, 1],
    index === 0 ? [1, 1, 0, 0] : [0, 0, 1, 1],
  );

  return (
    <motion.li
      data-process-card={step.number}
      className="absolute left-1/2 top-1/2 flex h-[min(62vh,500px)] min-h-[320px] w-[min(calc(100vw-2rem),780px)] -translate-x-1/2 -translate-y-1/2 flex-col justify-between overflow-hidden border border-ink/40 bg-paper p-6 text-ink shadow-[0_24px_70px_rgba(0,0,0,.4)] sm:border-paper/40 sm:bg-ink sm:p-10 sm:text-paper lg:p-14"
      style={{
        y,
        x,
        scale,
        opacity,
        rotate,
        transformOrigin: "50% 0%",
        willChange: "transform, opacity",
        zIndex: total - index,
      }}
    >
      <motion.div style={{ opacity: contentOpacity }}>
        <h3 className="display max-w-3xl text-4xl font-black leading-[.9] tracking-[-.065em] text-ink sm:text-6xl sm:text-paper lg:text-7xl">
          {step.title}
        </h3>
      </motion.div>
      <motion.p
        className="max-w-2xl text-lg leading-8 text-ink/75 sm:text-xl sm:leading-9 sm:text-paper/80"
        style={{ opacity: contentOpacity }}
      >
        {step.copy}
      </motion.p>
    </motion.li>
  );
}

function BenefitPeelCard({
  benefit,
  index,
  total,
  progress,
}: {
  benefit: WebsiteBenefit;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const isLast = index === total - 1;
  const settleAt = index === 0 ? 0.001 : index * 0.23 - 0.01;
  const peelStart = 0.24 + index * 0.22;
  const peelEnd = peelStart + 0.18;
  const initialOffset = `${index * 3.5}vh`;
  const direction = index % 2 === 0 ? -1 : 1;
  const initialX = index === 0 ? "0vw" : index % 2 ? "3vw" : "-3vw";
  const baseRotation = -1.6 + index * 1.1;
  const range = isLast
    ? [0, settleAt, 1]
    : [0, settleAt, peelStart, peelEnd, 1];

  const y = useTransform(
    progress,
    range,
    isLast
      ? [initialOffset, "0vh", "0vh"]
      : [initialOffset, "0vh", "0vh", "116vh", "116vh"],
  );
  const x = useTransform(
    progress,
    range,
    isLast
      ? [initialX, "0vw", "0vw"]
      : [initialX, "0vw", "0vw", `${direction * 17}vw`, `${direction * 17}vw`],
  );
  const rotate = useTransform(
    progress,
    range,
    isLast
      ? [`${baseRotation}deg`, "0deg", "0deg"]
      : [`${baseRotation}deg`, "0deg", "0deg", `${direction * 11}deg`, `${direction * 11}deg`],
  );
  const scale = useTransform(
    progress,
    range,
    isLast
      ? [1 - index * 0.04, 1, 1]
      : [1 - index * 0.04, 1, 1, 0.9, 0.9],
  );
  const opacity = useTransform(
    progress,
    isLast
      ? index === 0
        ? [0, 0.02, 0.12, 1]
        : [0, settleAt, 1]
      : index === 0
        ? [0, 0.02, 0.12, peelEnd - 0.04, peelEnd, 1]
        : [0, peelEnd - 0.04, peelEnd, 1],
    isLast
      ? index === 0
        ? [0, 0, 1, 1]
        : [1, 1, 1]
      : index === 0
        ? [0, 0, 1, 1, 0, 0]
        : [1, 1, 0, 0],
  );
  const labelOpacity = useTransform(
    progress,
    index === 0 ? [0, peelEnd - 0.04, peelEnd, 1] : [0, settleAt - 0.04, settleAt, 1],
    index === 0 ? [1, 1, 0, 0] : [0, 0, 1, 1],
  );

  return (
    <motion.article
      data-benefit-card={benefit.number}
      className={`absolute left-1/2 top-[22vh] flex h-[min(58vh,470px)] min-h-[300px] w-full -translate-x-1/2 flex-col justify-between overflow-hidden border border-ink p-6 sm:p-10 lg:p-12 ${benefit.style}`}
      style={{
        y,
        x,
        scale,
        opacity,
        rotate,
        transformOrigin: "50% 0%",
        willChange: "transform, opacity",
        zIndex: total - index,
      }}
    >
      <motion.div style={{ opacity: labelOpacity }}>
        <p className="eyebrow">{benefit.number} / {benefit.label}</p>
        <h3 className="display mt-8 max-w-3xl text-4xl font-black leading-[.9] tracking-[-.06em] sm:mt-12 sm:text-6xl lg:text-7xl">
          {benefit.title}
        </h3>
      </motion.div>
      <motion.p
        className="max-w-2xl text-base leading-7 sm:text-lg sm:leading-8"
        style={{ opacity: labelOpacity }}
      >
        {benefit.copy}
      </motion.p>
      <span className="absolute bottom-5 right-6 font-mono text-5xl font-bold tracking-[-.08em] opacity-20 sm:bottom-8 sm:right-10 sm:text-7xl" aria-hidden="true">
        {benefit.number}
      </span>
    </motion.article>
  );
}

function WhatYouGet() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 95,
    damping: 28,
    mass: 0.35,
    restDelta: 0.0005,
  });
  const cardProgress = useTransform(progress, [0, 0.15, 1], [0, 0, 1]);
  const headingOpacity = useTransform(progress, [0, 0.1, 0.15], [1, 1, 0]);
  const headingY = useTransform(progress, [0, 0.15], ["0vh", "-8vh"]);
  const reduced = useReducedMotion();
  const benefits: WebsiteBenefit[] = [
    {
      number: "01",
      label: "Make it easy to get in touch",
      title: "Make the next step obvious",
      copy: "Make it easy for customers to contact you. Clear tap-to-call buttons and straightforward quote request forms put the next step within reach, especially on mobile.",
      style: "bg-signal",
    },
    {
      number: "02",
      label: "Make your services clear",
      title: "Help the right customers find what they need.",
      copy: "Show people exactly what you do, the jobs you take on and the areas you cover. Clear information helps potential customers quickly understand whether you're right for their project.",
      style: "bg-paper",
    },
    {
      number: "03",
      label: "Show off your work",
      title: "Let the quality speak for itself.",
      copy: "Put your best projects front and centre with genuine photographs and customer reviews. Give potential customers a feel for your work and the standard they can expect.",
      style: "bg-moss text-paper",
    },
    {
      number: "04",
      label: "Build trust from the first visit",
      title: "Give your reputation somewhere to go.",
      copy: "Recommendations get people interested. Your website gives them somewhere professional to explore your services, see your work and learn more about your business.",
      style: "bg-clay",
    },
  ];

  return (
    <section aria-labelledby="why-website-heading" className="bg-paper">
      {reduced ? (
        <div className="container py-20 lg:py-28">
          <div className="border-t border-ink pt-5">
            <p className="eyebrow">01 / Why a website</p>
            <h2
              id="why-website-heading"
              className="display mt-6 max-w-xl text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-7xl"
            >
              GOOD WORK DESERVES A GOOD FIRST IMPRESSION.
            </h2>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <article
                key={benefit.number}
                className={`min-h-64 border border-ink p-6 sm:p-8 ${benefit.style}`}
              >
                <p className="eyebrow">{benefit.number} / {benefit.label}</p>
                <h3 className="display mt-10 max-w-lg text-4xl font-black leading-[.9] tracking-[-.06em] sm:text-5xl">
                  {benefit.title}
                </h3>
                <p className="mt-4 max-w-lg leading-7">{benefit.copy}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 border-b border-ink/30 pb-7">
            <BenefitSectionFooter />
          </div>
          <RedesignCallout />
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="relative h-[500vh]">
            <div className="sticky top-20 h-[calc(100vh-5rem)] overflow-hidden">
              <div className="container relative h-full">
                <motion.div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-paper px-4 text-center"
                  style={{
                    opacity: headingOpacity,
                    y: headingY,
                    pointerEvents: "none",
                  }}
                >
                  <p className="eyebrow">X01 / Why a website</p>
                  <h2
                    id="why-website-heading"
                    className="display mt-6 max-w-5xl text-5xl font-black leading-[.84] tracking-[-.085em] sm:text-7xl lg:text-8xl"
                  >
                    GOOD WORK DESERVES A GOOD FIRST IMPRESSION.
                  </h2>
                </motion.div>
                <div className="absolute inset-x-0 top-0 h-full">
                  {benefits.map((benefit, index) => (
                    <BenefitPeelCard
                      key={benefit.number}
                      benefit={benefit}
                      index={index}
                      total={benefits.length}
                      progress={cardProgress}
                    />
                  ))}
                </div>
                <p className="absolute bottom-5 left-0 font-mono text-[10px] uppercase tracking-[.14em] text-ink/65 sm:bottom-7">
                  Scroll to explore / 04 benefits
                </p>
              </div>
            </div>
          </div>
          <div className="container py-8">
            <div className="flex flex-col gap-5 border-b border-ink/30 pb-7 sm:flex-row sm:items-center sm:justify-between">
              <BenefitSectionFooter />
            </div>
            <RedesignCallout />
          </div>
        </>
      )}
    </section>
  );
}

function BenefitSectionFooter() {
  return (
    <>
      <p className="max-w-xl text-sm leading-6 text-ink/70">
        Keep the channels that already work for you. Your website gives them a professional
        place to point potential customers.
      </p>
      <a href="#pricing" className="button-secondary self-start sm:self-auto">
        Explore website packages <ArrowRight className="size-4" />
      </a>
    </>
  );
}

function RedesignCallout() {
  return (
    <aside className="mt-10 border border-ink bg-signal p-6 sm:mt-14 sm:p-10 lg:p-12">
      <p className="eyebrow">Already have a website?</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
        <h3 className="display max-w-4xl text-4xl font-black leading-[.86] tracking-[-.075em] sm:text-6xl lg:text-7xl">
          SITE OR NO SITE. I’M HERE FOR YOU.
        </h3>
        <div>
          <p className="max-w-xl text-base leading-7">
            Whether you need your first website or a complete redesign of the one you already have,
            I’ll help you create a site that works harder for your trade.
          </p>
          <a href="#contact" className="button-primary mt-5">
            Let’s talk about your website <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </aside>
  );
}

function Process() {
  const stepsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stepsRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 95,
    damping: 28,
    mass: 0.35,
    restDelta: 0.0005,
  });
  const reduced = useReducedMotion();
  const advantages = [
    {
      title: "I’ll handle the website.",
      copy: "No spending your evenings learning how to build a website.",
    },
    {
      title: "No jargon. No complicated setup.",
      copy: "Clear advice and a simple process from the first conversation onward.",
    },
    {
      title: "Built around your trade.",
      copy: "Your services, your work, your customers and the kind of jobs you want more of.",
    },
  ];

  const steps: WebsiteStep[] = [
    {
      number: "01",
      title: "Tell me about your business",
      copy: "We’ll talk about your trade, the work you do, your service areas and what you want your website to achieve.",
    },
    {
      number: "02",
      title: "Agree your website",
      copy: "We’ll choose the right package, agree the pages and features, and confirm the price before any work begins.",
    },
    {
      number: "03",
      title: "Review your website",
      copy: "I’ll put together your website for you to review. You can check the wording, images and details and provide feedback before launch.",
    },
    {
      number: "04",
      title: "Get ready to go live",
      copy: "Once everything is approved, we’ll complete the final checks and get your website ready to launch.",
    },
  ];

  return (
    <section id="how-it-works" className="scroll-target bg-ink py-20 text-paper lg:py-28">
      <div className="container">
        <div className="grid gap-8 border-t border-paper/50 pt-5 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <p className="eyebrow">02 / How it works</p>
            <h2 className="display mt-6 max-w-2xl text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-7xl">
              YOU KNOW YOUR TRADE. I’LL TAKE CARE OF THE WEBSITE.
            </h2>
          </div>
          <ScrollTextReveal delay={0.12}>
            <div className="border-l-4 border-signal py-2 pl-6 sm:pl-8">
              <p className="display text-[clamp(5rem,12vw,9rem)] font-black leading-[.78] tracking-[-.1em] text-signal">
                40+
              </p>
              <p className="mt-4 max-w-xs font-mono text-sm font-bold uppercase leading-6 tracking-[.12em] text-paper">
                Sites built solo this year
              </p>
            </div>
          </ScrollTextReveal>
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
        {reduced ? (
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
        ) : (
          <div
            ref={stepsRef}
            className="relative mt-12 h-[420vh] sm:h-[440vh]"
            aria-label="Four steps from first conversation to launch"
          >
            <div className="sticky top-20 h-[calc(100vh-5rem)] overflow-hidden">
              <div className="container relative h-full">
                <ol className="absolute inset-0 m-0 list-none p-0">
                  {steps.map((step, index) => (
                    <ProcessPeelCard
                      key={step.number}
                      step={step}
                      index={index}
                      total={steps.length}
                      progress={progress}
                    />
                  ))}
                </ol>
                <p className="absolute bottom-5 left-0 font-mono text-[10px] uppercase tracking-[.14em] text-paper/65 sm:bottom-7">
                  Scroll to follow the process / 04 steps
                </p>
              </div>
            </div>
          </div>
        )}
        <a href="#contact" className="button-primary mt-8">
          Talk through your website <ArrowRight className="size-4" />
        </a>
      </div>
    </section>
  );
}

function Pricing() {
  const addOns = [
    "Facebook and Instagram setup",
    "Google Business Profile setup",
    "Meta Ads setup",
    "QR-code Google review materials",
    "Business card design",
  ];

  const packages = [
    {
      name: "Online Presence Package",
      price: "£60",
      regularPrice: "£70",
      saving: "£10",
      details: [
        "Facebook business page setup",
        "Instagram professional account setup",
        "Google Business Profile setup",
        "TikTok business account setup (if required)",
      ],
    },
    {
      name: "Business Visibility Package",
      price: "£159",
      regularPrice: "£180",
      saving: "£21",
      details: [
        "Everything in Online Presence",
        "Meta Ads account and initial campaign setup",
        "QR-code Google review materials",
        "Business card design featuring the Google review QR code, with a print-ready design file",
      ],
    },
  ];

  const bundles = [
    {
      name: "Starter Website + Online Presence",
      price: "£345",
      regularPrice: "£360",
      saving: "£15",
      includes: "Starter Website and Online Presence Package",
    },
    {
      name: "Complete Website + Business Visibility",
      price: "£629",
      regularPrice: "£659",
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
              A PROFESSIONAL WEBSITE. A CLEAR PRICE.
            </h2>
          </div>
          <div className="self-end">
            <p className="text-lg leading-7 text-ink/75">
              No confusing estimates or unexpected surprises. Choose the website size that suits
              your business. If you need something bigger, I’ll put together a tailored quote.
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
              <p className="mt-4 font-mono text-3xl font-bold tracking-tight">£300</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink/60">
                One-off
              </p>
              <p className="mt-4 text-sm leading-6 text-ink/75">
                A professional one-page website covering the essentials, giving customers a clear
                introduction to your business and an easy way to contact you.
              </p>
              <ul className="mt-6 grid gap-3 border-t border-ink/25 pt-5 text-sm leading-6">
                {[
                  "Business introduction and services",
                  "Areas you cover",
                  "Basic work gallery",
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
                  Get the Online Presence Package for £45 instead of £60 when purchased with this
                  website.
                </span>
                <span className="mt-3 block font-mono text-xs font-bold uppercase tracking-wide">
                  Combined price: £345. Save £15.
                </span>
              </a>
              <a
                href="#contact"
                className="mt-auto inline-flex items-center gap-2 pt-8 font-mono text-xs font-bold uppercase tracking-wider underline decoration-1 underline-offset-4"
              >
                Get a Starter quote <ArrowRight className="size-4" aria-hidden="true" />
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
                <p className="mt-4 font-mono text-3xl font-bold tracking-tight">£500</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink/60">
                  One-off
                </p>
                <p className="mt-4 text-sm leading-6 text-ink/75">
                  A website of up to five pages, giving your services, business information and previous work the space they deserve.
                </p>
                <ul className="mt-6 grid gap-3 border-t border-ink/25 pt-5 text-sm leading-6">
                  {[
                    "Everything needed for a professional website",
                    "Up to five pages",
                    "Dedicated pages for your services",
                    "Dedicated page gallery displaying all your work",
                    "About your business and how you work",
                    "Dedicated contact and enquiry page",
                    "More room for project photos and details",
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
                  className="mt-6 block border border-ink/25 bg-paper/75 p-4 transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-1"
                >
                  <span className="eyebrow">Add Business Visibility</span>
                  <span className="mt-2 block text-sm leading-5">
                    Get the Business Visibility Package for £129 instead of £159 when purchased
                    with this website.
                  </span>
                  <span className="mt-3 block font-mono text-xs font-bold uppercase tracking-wide">
                    Combined price: £629. Save £30.
                  </span>
                </a>
                <a
                  href="#contact"
                  className="mt-8 inline-flex items-center gap-2 pt-2 font-mono text-xs font-bold uppercase tracking-wider underline decoration-1 underline-offset-4"
                >
                  Get a Complete quote <ArrowRight className="size-4" aria-hidden="true" />
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

        <div className="mt-16">
          <div className="mb-5 border-b border-ink pb-3">
            <p className="eyebrow">02 / Need more than five pages?</p>
            <h3 className="display mt-2 text-3xl font-black leading-none tracking-[-.05em] sm:text-4xl">
              No problem.
            </h3>
          </div>
          <p className="max-w-2xl text-lg leading-7 text-ink/75">
            Tell me what you need and I’ll put together a price based on the size and requirements
            of your project.
          </p>
          <a href="#contact" className="button-primary mt-6">
            Request a tailored quote <ArrowRight className="size-4" />
          </a>
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
            <p className="eyebrow">02 / Optional digital services</p>
            <h3 className="display mt-2 text-3xl font-black leading-none tracking-[-.05em] sm:text-4xl">
              Build more of your online presence.
            </h3>
          </div>
          <p className="max-w-2xl text-lg leading-7 text-ink/75">
            Already have a website, or want a little more help getting your business online? Add the
            services that make sense for you.
          </p>
          <div className="mt-6 overflow-hidden border border-ink bg-paper">
            <ul className="grid gap-x-8 px-5 sm:grid-cols-2 sm:px-7 lg:grid-cols-3">
              {addOns.map((service) => (
                <li key={service} className="border-b border-ink/20 py-4">
                  <h4 className="font-bold leading-5">{service}</h4>
                </li>
              ))}
            </ul>
            <a
              href="#contact"
              className="group flex flex-col gap-4 bg-ink p-5 text-paper transition-colors hover:bg-moss focus-visible:outline-paper sm:flex-row sm:items-center sm:justify-between sm:px-7"
            >
              <div>
                <h4 className="eyebrow text-paper">Not sure what you need?</h4>
                <p className="mt-2 max-w-2xl text-sm leading-5 text-paper/75">
                  Tell me a little about your business and I&apos;ll help you work out which
                  services would be useful.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-paper underline decoration-signal decoration-2 underline-offset-4">
                Let&apos;s talk{" "}
                <ArrowRight
                  className="size-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </a>
          </div>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
          <div className="border border-ink bg-signal p-6 sm:p-8">
            <p className="eyebrow">04 / Ongoing support</p>
            <h3 className="display mt-4 text-3xl font-black leading-[.95] tracking-[-.05em]">
              Website Care &amp; Support
            </h3>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono">
              <span className="text-xl text-ink/60 line-through">£29/month</span>
              <span className="text-4xl font-black uppercase tracking-tight">Free</span>
            </p>
            <p className="mt-2 max-w-xs font-mono text-xs font-bold uppercase leading-5 tracking-wider">
              First 2 months free, then £29.99/month. 12 monthly payments minimum after the free
              period.
            </p>
          </div>
          <div className="border border-ink bg-paper p-6 sm:p-8">
            <p className="eyebrow">A hand when you need it</p>
            <ul className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-2">
              {[
                "Regular website maintenance and technical checks",
                "Contact form checks to help make sure customer enquiries can reach you",
                "Up to 30 minutes of small text and photo updates every month",
                "Help with website and domain-related technical issues",
                "Basic website support when you need advice or a change",
                "Basic on-page SEO and Google visibility checks",
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
      question: "What does Facebook and Instagram setup include?",
      answer:
        "I’ll set up your Facebook business page and Instagram professional account, add your logo and business details, link them to your website and connect the profiles where appropriate. I’ll also publish the first batch of images you provide, so the profiles are ready to show customers what you do.",
    },
    {
      question: "What does Google Business Profile setup do?",
      answer:
        "I’ll set up or help complete your Google Business Profile with accurate business details, services, service area, contact information, website link, logo and photos you provide. Google may ask you to verify the business. Setup helps customers find and understand your business on Google Search and Maps, but it can’t guarantee a particular ranking or number of enquiries.",
    },
    {
      question: "What are Meta Ads?",
      answer:
        "Meta Ads are paid adverts on Facebook and Instagram. I can set up an initial campaign with a daily, weekly or monthly budget you choose, designed to show your advert to relevant potential customers in your target area. The advertising spend is paid separately, and results such as enquiries or new work aren’t guaranteed.",
    },
    {
      question: "I get most of my work through recommendations. Why do I need a website?",
      answer:
        "Recommendations are valuable. But people often look a business up before deciding to get in touch. A professional website gives them somewhere to see your work, understand your services and feel confident taking the next step.",
    },
    {
      question: "I already have Facebook. Isn't that enough?",
      answer:
        "Facebook is useful for updates, photos and staying connected with customers. Your website gives your business a professional home of its own, where your services, work and contact details are easy to find.",
    },
    {
      question: "Will my website get me to the top of Google?",
      answer:
        "No one can honestly guarantee that. Your website will have a sound technical SEO foundation and clear information about your business and services. Search visibility also depends on competition, your Google Business Profile and other factors.",
    },
    {
      question: "How much does a website cost?",
      answer:
        "A one-page Starter Website is £300. A Complete Website of up to five pages is £500. Larger websites are priced according to their requirements. You'll know the agreed price before work begins.",
    },
    {
      question: "Do I need to know anything about websites?",
      answer:
        "Not at all. You know your trade and your customers. I'll explain the choices in plain English and handle the design and development.",
    },
    {
      question: "What do I need to provide?",
      answer:
        "You'll need to provide accurate information about your business, services and coverage, along with any photographs you have permission to use. I'll help organise everything and you'll have the opportunity to review the website before it goes live.",
    },
    {
      question: "Do I own my website?",
      answer:
        "Your website is built for your business, with a clear handover and no hidden lock-in. The ownership and access arrangements will be explained before the project starts.",
    },
    {
      question: "Can I get help after the website launches?",
      answer:
        "Yes. You can arrange ongoing Website Care & Support, or have a straightforward handover if you prefer to manage updates yourself.",
    },
  ];
  const faqs = additionalFaqs;

  return (
    <section id="faq" className="scroll-target bg-paper py-20 lg:py-28">
      <div className="container grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-16">
        <div>
          <p className="eyebrow border-t border-ink pt-5">04 / Straight answers</p>
          <h2 className="display mt-6 text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-6xl">
            GOOD QUESTIONS. STRAIGHT ANSWERS.
          </h2>
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
                Professional work.
              </p>
            </div>
          </div>
          <p className="mt-7 max-w-xl text-lg leading-7">
            I come from a family of tradespeople, so I understand the demands of working in the
            trade and how valuable your time is. The last thing you need is complicated web jargon
            or hours spent trying to build and manage a website yourself.
          </p>
          <p className="mt-4 max-w-xl text-lg leading-7">
            That&apos;s why I keep things straightforward. I&apos;ll listen to what your business
            needs, give you clear advice and build a professional website around the work you
            actually do – helping customers understand your services, see the quality of your work
            and get in touch.
          </p>
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
        trackGenerateLead(idempotencyKey);
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
            LET&apos;S GET YOUR BUSINESS ONLINE.
          </h2>
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
        <div>
          <form className="border border-ink bg-paper p-5 sm:p-8" onSubmit={submit}>
            <p className="eyebrow mb-6">A few details are all I need to get started.</p>
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
              {formState.phase === "submitting" ? "Sending…" : "Get my website quote"}
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
          <div className="mt-8 border-t border-ink/40 pt-6">
            <p className="max-w-md text-lg leading-7">
              Getting a website built with me is straightforward. Simply tell me:
            </p>
            <ul className="mt-4 max-w-md list-disc space-y-2 pl-5 text-lg leading-7">
              <li>What trade or industry you&apos;re in.</li>
              <li>What services you offer and the work you do.</li>
              <li>
                What you&apos;d like your website to achieve – whether that&apos;s getting more
                enquiries, showcasing your work, helping customers find you or making it easier for
                people to get in touch.
              </li>
            </ul>
            <p className="mt-4 max-w-md text-lg leading-7">
              I&apos;ll look at what your business needs and come back with a clear recommendation and
              price. There&apos;s no pressure to go ahead.
            </p>
          </div>
        </div>
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
          <Link className="inline-flex min-h-8 items-center transition-colors hover:text-paper" href="/privacy">Privacy</Link>
          <button type="button" className="inline-flex min-h-8 items-center transition-colors hover:text-paper" onClick={openCookieSettings}>Cookie settings</button>
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
              <p className="eyebrow">Selected work / Three live projects</p>
            </ScrollTextReveal>
            <ScrollTextReveal delay={0.12}>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
                Every business is different. Your website should reflect the work you do and the
                customers you want to reach.
              </p>
            </ScrollTextReveal>
            <ScrollTextReveal delay={0.15}>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
                Three live websites built for tradespeople and local businesses.
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
