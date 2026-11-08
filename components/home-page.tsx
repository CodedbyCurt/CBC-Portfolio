"use client";

import { type FormEvent, useReducer, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Menu, Phone, X } from "lucide-react";
import { siteConfig, type Project } from "@/lib/site-config";
import {
  enquiryFormReducer,
  getEnquiryIdempotencyKey,
  initialEnquiryFormState,
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

const hasConfiguredPhone = siteConfig.phoneHref !== "+442000000000";
const hasConfiguredEmail = !siteConfig.email.endsWith("@example.com");
const hasConfiguredWhatsApp = !siteConfig.whatsappHref.endsWith("442000000000");

function Wordmark() {
  return (
    <a
      href="#top"
      className="display inline-flex items-baseline text-2xl font-black tracking-[-.08em]"
      aria-label={`${siteConfig.name} home`}
    >
      CODED<span className="text-signal">BY</span>CURT
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
            <a key={link.href} href={link.href} className="eyebrow transition-colors hover:text-signal">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden lg:block">
          <a href="#contact" className="button-primary !min-h-10">
            Talk through your website <ArrowRight className="size-4" />
          </a>
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          <a
            href="#contact"
            className="font-mono text-[10px] font-bold tracking-tight underline decoration-signal decoration-2 underline-offset-4"
          >
            Get a quote
          </a>
          <button
            type="button"
            className="grid size-10 place-items-center border border-paper/50"
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

function Hero() {
  const reduced = useReducedMotion();

  return (
    <section id="top" className="relative isolate overflow-hidden bg-ink text-paper">
      <video
        className="absolute inset-0 -z-20 size-full object-cover"
        autoPlay={!reduced}
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src="/portfoliohero.mp4" type="video/mp4" />
      </video>
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
            initial={false}
            animate={{ opacity: 1, y: 0 }}
          >
            LOOK THE PART
            <br />
            BEFORE THEY
            <br />
            <span className="text-signal">CALL.</span>
          </motion.h1>
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
        <span>For independent trades and home-service businesses</span>
        <a className="hidden transition-colors hover:text-signal sm:block" href="#how-it-works">
          A simple process ↓
        </a>
      </div>
    </section>
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
          <div className="flex flex-wrap items-center gap-3 eyebrow">
            <span className="inline-grid size-7 place-items-center border border-current">
              {project.number}
            </span>
            {project.trade} <span aria-hidden="true">·</span> {project.location}
          </div>
          <h2 className="display mt-7 text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-7xl">
            {project.name}
          </h2>
          <dl className="mt-8 space-y-5 border-t border-current/50 pt-5">
            <div>
              <dt className="eyebrow opacity-70">The customer’s challenge</dt>
              <dd className="mt-2 text-base leading-7 sm:text-lg">{project.problem}</dd>
            </div>
            <div>
              <dt className="eyebrow opacity-70">The approach</dt>
              <dd className="mt-2 text-base leading-7 sm:text-lg">{project.built}</dd>
            </div>
            <div>
              <dt className="eyebrow opacity-70">What the site makes easier</dt>
              <dd className="mt-2 text-base leading-7 sm:text-lg">{project.result}</dd>
            </div>
          </dl>
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
    "Landscapers",
    "Home services",
  ];

  return (
    <section aria-label="Trades served" className="overflow-hidden border-y border-ink bg-ink py-5 text-paper">
      <p className="sr-only">Websites for {trades.join(", ")}.</p>
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
  const steps = [
    {
      number: "01",
      title: "Tell me about the work",
      copy: "A short conversation about your trade, service area and the jobs you want the site to support.",
    },
    {
      number: "02",
      title: "Agree the right scope",
      copy: "I’ll explain what’s useful, what it costs and what I’ll need from you before we start.",
    },
    {
      number: "03",
      title: "Review the first version",
      copy: "Check the wording, images and contact details together. No web design experience needed.",
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
              YOU’RE BUSY. THIS SHOULDN’T BE A SECOND JOB.
            </h2>
          </div>
          <p className="max-w-lg self-end text-lg leading-7 text-paper/75">
            No jargon and no need to learn a website builder. I’ll keep the decisions clear and
            focused; you bring the trade knowledge, photos and feedback that make it yours.
          </p>
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
  const scopes = [
    {
      number: "01",
      name: "A clear starting point",
      price: "From £400",
      intro: "For a straightforward site that gets the essentials in order.",
      details: [
        "Your services and the areas you cover",
        "A clear way to call or request a quote",
        "Space for work photos and useful details",
      ],
      cta: "Ask about the essentials",
      featured: true,
    },
    {
      number: "02",
      name: "More room to show your work",
      price: "Scoped to your needs",
      intro: "For businesses that need more detail around services and completed jobs.",
      details: [
        "More space to explain individual services",
        "A more detailed project or photo showcase",
        "Genuine reviews, if you have them to share",
      ],
      cta: "Discuss a work showcase",
      featured: false,
    },
    {
      number: "03",
      name: "A tailored brief",
      price: "Quoted individually",
      intro: "For a bigger or more specific brief that needs planning before a price is set.",
      details: [
        "Talk through what the business needs",
        "Agree the scope before work begins",
        "A clear quote with no surprise add-ons",
      ],
      cta: "Talk through your brief",
      featured: false,
    },
  ];

  return (
    <section id="pricing" className="scroll-target bg-clay py-20 lg:py-28">
      <div className="container">
        <div className="grid gap-8 border-t border-ink pt-5 lg:grid-cols-[1fr_.8fr]">
          <div>
            <p className="eyebrow">03 / Pricing & scope</p>
            <h2 className="display mt-6 max-w-2xl text-5xl font-black leading-[.88] tracking-[-.075em] sm:text-7xl">
              A CLEAR STARTING POINT. A PRICE AGREED UP FRONT.
            </h2>
          </div>
          <div className="self-end">
            <p className="text-lg leading-7 text-ink/75">
              Every business needs something a little different. Use these as starting points,
              not off-the-shelf promises. I’ll recommend what fits, explain the cost and agree
              exactly what’s included before any work begins.
            </p>
          </div>
        </div>
        <div className="mt-10 grid gap-3 lg:grid-cols-3">
          {scopes.map((scope) => (
            <article
              key={scope.number}
              className={`flex min-h-full flex-col border border-ink p-6 sm:p-7 ${
                scope.featured ? "bg-signal" : "bg-paper"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="eyebrow">{scope.number} / Scope guide</p>
                {scope.featured && (
                  <span className="border border-ink px-2 py-1 font-mono text-[9px] uppercase tracking-wider">
                    Starting point
                  </span>
                )}
              </div>
              <h3 className="display mt-8 text-3xl font-black leading-[.92] tracking-[-.055em]">
                {scope.name}
              </h3>
              <p className="mt-3 font-mono text-sm font-bold uppercase tracking-wide">{scope.price}</p>
              <p className="mt-4 text-sm leading-6 text-ink/75">{scope.intro}</p>
              <ul className="mt-6 grid gap-3 border-t border-ink/25 pt-5 text-sm leading-6">
                {scope.details.map((detail) => (
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
                {scope.cta} <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-ink/70">
          The £400 figure is a starting price for a straightforward scope, not a promise that
          every feature or ongoing cost is included. We’ll confirm what your project needs first.
        </p>
      </div>
    </section>
  );
}

function FAQ() {
  const additionalFaqs = [
    {
      question: "Websites sound expensive. What does the price cover?",
      answer:
        "A straightforward project starts from £400, with the final price based on the agreed scope. I’ll explain what’s included and any additional costs before work begins, so you can decide without pressure.",
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
              <summary className="flex cursor-pointer list-none justify-between gap-6 text-base font-bold leading-6 sm:text-lg">
                <span>
                  <span className="mr-3 font-mono text-xs text-signal">
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
    if (!payload.email.trim() && !payload.phone.trim()) {
      dispatch({
        type: "validation-error",
        fieldErrors: { email: "Provide an email address or phone number." },
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
              Your name
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
              Phone number <span className="font-sans normal-case tracking-normal">(or email)</span>
              <input
                name="phone"
                type="tel"
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
              Email address <span className="font-sans normal-case tracking-normal">(or phone)</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
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
          <a className="transition-colors hover:text-paper" href="#work">Work</a>
          <a className="transition-colors hover:text-paper" href="#pricing">Pricing</a>
          <a className="transition-colors hover:text-paper" href="#contact">Get in touch</a>
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
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    ...(hasConfiguredEmail ? { email: siteConfig.email } : {}),
    ...(hasConfiguredPhone ? { telephone: siteConfig.phone } : {}),
    areaServed: siteConfig.serviceArea,
    serviceType: "Web design for trades businesses",
  };

  return (
    <>
      <SmoothScroll />
      <Header />
      <main>
        <Hero />
        <ProjectScroll />
        <section id="work" className="scroll-target">
          <div className="container py-8 sm:py-10">
            <p className="eyebrow">Selected work / One live project, two concepts</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
              The plastering site is a live client project. The electrical and roofing examples
              are concepts—not client results or live businesses.
            </p>
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
