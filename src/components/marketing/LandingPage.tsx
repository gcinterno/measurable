"use client";

import Link from "next/link";

import { FEATURES } from "@/config/features";

const logos = [
  "Northpeak Studio",
  "Atlas Growth",
  "Brightlane",
  "Studio Delta",
  "Foundry Labs",
] as const;

const testimonials = [
  {
    quote:
      "This replaced 6 hours of reporting every week. Now it's done in minutes.",
    author: "Marketing Agency Owner",
  },
  {
    quote:
      "Our client reports finally look polished without anyone touching spreadsheets.",
    author: "Performance Lead",
  },
  {
    quote:
      "We can move faster, look more professional, and spend more time on strategy.",
    author: "Founder running ads",
  },
] as const;

const painPoints = [
  "Manual reporting takes hours every week",
  "Data lives across multiple platforms",
  "Clients expect clean, presentation-ready decks",
] as const;

const solutionPoints = [
  "Connect Facebook and your key data sources",
  "AI structures the report automatically",
  "Generate polished reports instantly",
] as const;

const howItWorks = [
  {
    step: "01",
    title: "Connect your data",
    description:
      "Bring in Facebook, Instagram, Excel, CRM, and more from one clean flow.",
    icon: "connect",
  },
  {
    step: "02",
    title: "Let AI structure your report",
    description:
      "Measurable organizes KPIs, narrative, and slides without manual formatting.",
    icon: "spark",
  },
  {
    step: "03",
    title: "Download or share instantly",
    description:
      FEATURES.ENABLE_PPTX_EXPORT
        ? "Export a client-ready PDF or PPTX in minutes, not hours."
        : "Export a client-ready PDF in minutes, not hours.",
    icon: "share",
  },
] as const;

const features = [
  {
    title: "Automated reporting",
    description: "Stop rebuilding the same deck every month by hand.",
  },
  {
    title: "AI-powered insights",
    description: "Turn raw metrics into a narrative your clients can understand.",
  },
  {
    title: "Beautiful templates",
    description: "Presentation-ready layouts designed to look premium from the start.",
  },
  {
    title: FEATURES.ENABLE_PPTX_EXPORT ? "Export to PDF & PPTX" : "Export to PDF",
    description: "Deliver reports in the formats clients and teams already expect.",
  },
  {
    title: "Multi-source data",
    description: "Bring Meta, Excel, CRM, and additional sources into one workflow.",
  },
  {
    title: "Built for agencies",
    description: "Handle more accounts and more reporting without hiring more ops work.",
  },
] as const;

const pricing = [
  {
    name: "Free",
    price: "$0",
    subtitle: "For trying the workflow",
    featured: false,
    items: ["Limited reports", "Basic templates", "Core exports"],
  },
  {
    name: "Pro",
    price: "$49",
    subtitle: "For growing teams",
    featured: true,
    items: [
      "More reports",
      ...(FEATURES.ENABLE_PPTX_EXPORT ? ["PPTX export"] : []),
      "More templates",
    ],
  },
  {
    name: "Premium",
    price: "$149",
    subtitle: "For scaling agencies",
    featured: false,
    items: ["Unlimited reports", "All templates", "Integrations + automation"],
  },
] as const;

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
      {children}
    </p>
  );
}

function PrimaryCta({
  href = "/login",
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800"
    >
      {children}
    </Link>
  );
}

function SecondaryCta({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold tracking-[0.24em] text-sky-200">
            M
          </div>
          <div>
            <p className="text-base font-semibold text-slate-950">Measurable</p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              AI reporting
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          <a href="#how-it-works" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
            How it works
          </a>
          <a href="#features" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
            Features
          </a>
          <a href="#pricing" className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            Login
          </Link>
          <PrimaryCta>Start free</PrimaryCta>
        </div>
      </div>
    </header>
  );
}

function HeroMockup() {
  return (
    <div className="group rounded-[36px] border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#f7fbff_45%,#ebf2ff_100%)] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_36px_100px_rgba(15,23,42,0.12)] sm:p-6">
      <div className="rounded-[30px] border border-slate-900/90 bg-[linear-gradient(160deg,#07111f_0%,#0b1730_42%,#1d4ed8_100%)] p-4 text-white shadow-[0_26px_60px_rgba(2,6,23,0.28)] transition duration-500 group-hover:scale-[1.01] sm:p-6">
        <div className="rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-200">
                Executive report
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-[-0.05em] sm:text-2xl">
                Monthly Growth Review
              </h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              01 / 05
            </span>
          </div>

          <div className="mt-6 rounded-[24px] bg-[linear-gradient(145deg,#020617_0%,#0f172a_34%,#1d4ed8_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-200">
                    Cover slide
                  </p>
                  <h4 className="mt-5 max-w-xl text-3xl font-semibold leading-[0.98] tracking-[-0.06em] text-white sm:text-4xl">
                    Meta pages performance overview for your monthly client meeting.
                  </h4>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-slate-200">
                    A presentation-ready summary with KPIs, narrative, and board-style slides generated from live marketing data.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100">
                    Last 28 days
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100">
                    Executive dark
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100">
                    PPT / PDF ready
                  </span>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                    Brand panel
                  </p>
                  <div className="mt-4 flex h-24 items-center justify-center rounded-[18px] border border-dashed border-white/20 bg-black/20 text-sm text-slate-300">
                    Logo / image
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/6 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                    Executive snapshot
                  </p>
                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-2.5">
                      <span className="text-xs uppercase tracking-[0.16em] text-slate-300">Reach</span>
                      <span className="text-sm font-semibold text-white">82K</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-2.5">
                      <span className="text-xs uppercase tracking-[0.16em] text-slate-300">Followers</span>
                      <span className="text-sm font-semibold text-white">12.4K</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-2.5">
                      <span className="text-xs uppercase tracking-[0.16em] text-slate-300">Engagement</span>
                      <span className="text-sm font-semibold text-white">6.8%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] border border-white/10 bg-white px-4 py-4 text-slate-950 transition duration-500 group-hover:-translate-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                KPI slide
              </p>
              <p className="mt-5 text-4xl font-semibold tracking-[-0.05em]">
                82K
              </p>
              <p className="mt-2 text-sm text-slate-500">Reach</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-4 transition delay-75 duration-500 group-hover:-translate-y-2 group-hover:bg-white/12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                Analysis slide
              </p>
              <div className="mt-5 space-y-2">
                <div className="h-2 rounded-full bg-white/80" />
                <div className="h-2 w-10/12 rounded-full bg-white/35" />
                <div className="h-2 w-8/12 rounded-full bg-white/20" />
              </div>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4 transition delay-150 duration-500 group-hover:-translate-y-3 group-hover:bg-black/30">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                Conclusion slide
              </p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="h-2 w-2/3 rounded-full bg-sky-300/80" />
                <div className="mt-3 h-2 rounded-full bg-white/20" />
                <div className="mt-2 h-2 w-11/12 rounded-full bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.12),transparent_22%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-18 pt-12 sm:px-8 lg:grid-cols-[1fr_0.94fr] lg:items-center lg:px-10 lg:pb-24 lg:pt-16">
        <div className="max-w-3xl">
          <SectionEyebrow>AI-powered reporting platform</SectionEyebrow>
          <h1 className="mt-5 text-5xl font-semibold leading-[0.94] tracking-[-0.07em] text-slate-950 sm:text-6xl lg:text-[5.25rem]">
            Connect your marketing data &amp; generate client-ready reports in minutes.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Connect your data sources and generate beautiful, presentation-ready reports automatically. No spreadsheets. No manual work.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryCta>Start free</PrimaryCta>
            <SecondaryCta href="#how-it-works">See how it works</SecondaryCta>
          </div>

          <p className="mt-4 text-sm font-medium text-slate-500">
            No credit card required
          </p>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}

function SocialProofSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
      <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8">
        <div className="text-center">
          <SectionEyebrow>Social proof</SectionEyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
            Trusted by growing agencies and teams
          </h2>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {logos.map((logo) => (
            <div
              key={logo}
              className="flex h-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500 transition hover:-translate-y-0.5 hover:bg-white"
            >
              {logo}
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.author}
              className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6"
            >
              <p className="text-base leading-8 text-slate-700">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <p className="mt-5 text-sm font-semibold text-slate-950">
                {testimonial.author}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemSolutionSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-6 sm:px-8 lg:px-10">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8">
          <SectionEyebrow>The problem</SectionEyebrow>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
            Reporting still feels like ops work.
          </h2>
          <div className="mt-8 space-y-4">
            {painPoints.map((point) => (
              <div
                key={point}
                className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-400" />
                <p className="text-sm leading-7 text-slate-700 sm:text-base">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-800 bg-[linear-gradient(145deg,#07111f_0%,#0f172a_45%,#1d4ed8_100%)] p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] sm:p-8">
          <SectionEyebrow>Solution</SectionEyebrow>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">
            Measurable automates everything
          </h2>
          <div className="mt-8 space-y-4">
            {solutionPoints.map((point) => (
              <div
                key={point}
                className="flex items-start gap-3 rounded-[24px] border border-white/10 bg-white/8 px-4 py-4"
              >
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-300" />
                <p className="text-sm leading-7 text-slate-100 sm:text-base">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function StepIcon({ kind }: { kind: string }) {
  if (kind === "connect") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 stroke-current">
        <path d="M9 6V4.75M15 6V4.75M8 10.5h8a1 1 0 0 0 1-1v-1A2.75 2.75 0 0 0 14.25 5.75h-4.5A2.75 2.75 0 0 0 7 8.5v1a1 1 0 0 0 1 1Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 10.5v3.25c0 1.1.9 2 2 2h1.5a2.5 2.5 0 0 1 2.5 2.5v.75M12 13.5v6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === "spark") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 stroke-current">
        <path d="M12 3.5l1.8 4.7L18.5 10l-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8L12 3.5Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 stroke-current">
      <path d="M5 12h9M11 6l6 6-6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
      <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8">
        <div className="max-w-3xl">
          <SectionEyebrow>How it works</SectionEyebrow>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
            From disconnected data to a polished report in 3 steps
          </h2>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {howItWorks.map((step) => (
            <article
              key={step.step}
              className="group rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white transition group-hover:bg-blue-600">
                <StepIcon kind={step.icon} />
              </div>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Step {step.step}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                {step.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductPreviewSection() {
  return (
    <section className="bg-[linear-gradient(180deg,#07111f_0%,#0f172a_100%)] py-18 text-white">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <SectionEyebrow>Product preview</SectionEyebrow>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">
            A reporting experience built to look premium from the first export
          </h2>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <article className="rounded-[34px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">
              Dashboard preview
            </p>
            <div className="mt-5 grid gap-4">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-slate-300">Recent reports</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-white/8 px-4 py-3 text-sm text-slate-100">
                    Meta Pages Overview · Mar 2026
                  </div>
                  <div className="rounded-2xl bg-white/8 px-4 py-3 text-sm text-slate-100">
                    Agency Performance Report · Mar 2026
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                    Followers
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">12.4K</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                    Reach
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">82K</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/8 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
                    Engagement
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">6.8%</p>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,#08101d_0%,#132240_100%)] p-5 shadow-[0_26px_70px_rgba(2,6,23,0.32)]">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">
                  Report slide
                </p>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-slate-300">
                  02 / 05
                </span>
              </div>
              <h3 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                KPI Overview
              </h3>

              <div className="mt-6 grid gap-4 md:grid-cols-[1.12fr_0.88fr_0.88fr]">
                <div className="rounded-[26px] border border-sky-400/20 bg-[linear-gradient(145deg,#111827_0%,#1d4ed8_100%)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                    Reach
                  </p>
                  <p className="mt-8 text-5xl font-semibold tracking-[-0.05em] text-white">
                    82K
                  </p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white p-5 text-slate-950">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Followers
                  </p>
                  <p className="mt-8 text-5xl font-semibold tracking-[-0.05em]">
                    12.4K
                  </p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white p-5 text-slate-950">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Engagement
                  </p>
                  <p className="mt-8 text-5xl font-semibold tracking-[-0.05em]">
                    6.8%
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
      <div className="max-w-3xl">
        <SectionEyebrow>Features</SectionEyebrow>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Everything you need to scale reporting without the manual work
        </h2>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.04)] transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
          >
            <div className="h-11 w-11 rounded-2xl bg-slate-950" />
            <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              {feature.title}
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ValuePropSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-6 sm:px-8 lg:px-10">
      <div className="rounded-[36px] border border-slate-800 bg-[linear-gradient(145deg,#07111f_0%,#0f172a_45%,#1d4ed8_100%)] p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)] sm:p-8 lg:p-10">
        <div className="max-w-4xl">
          <SectionEyebrow>Value proposition</SectionEyebrow>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
            From raw data to executive reports in seconds
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">
            Move faster, look more professional, and scale reporting across more clients and campaigns without adding manual operations work.
          </p>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10">
      <div className="text-center">
        <SectionEyebrow>Pricing</SectionEyebrow>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
          Simple pricing for teams at every stage
        </h2>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-3">
        {pricing.map((plan) => (
          <article
            key={plan.name}
            className={`rounded-[32px] border p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] ${
              plan.featured
                ? "border-slate-900 bg-[linear-gradient(145deg,#07111f_0%,#0f172a_48%,#1d4ed8_100%)] text-white"
                : "border-slate-200 bg-white text-slate-950"
            }`}
          >
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${
                plan.featured ? "text-sky-200" : "text-slate-400"
              }`}
            >
              {plan.name}
            </p>
            <div className="mt-5 flex items-end gap-2">
              <p className="text-5xl font-semibold tracking-[-0.05em]">
                {plan.price}
              </p>
              <p className={plan.featured ? "text-slate-200" : "text-slate-500"}>
                /month
              </p>
            </div>
            <p className={`mt-3 text-sm ${plan.featured ? "text-slate-200" : "text-slate-500"}`}>
              {plan.subtitle}
            </p>

            <div className="mt-6 space-y-3">
              {plan.items.map((item) => (
                <div
                  key={item}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    plan.featured
                      ? "border border-white/10 bg-white/8 text-slate-100"
                      : "border border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6">
              {plan.featured ? (
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Start free
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Start free
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:px-10 lg:py-16">
      <div className="rounded-[38px] border border-slate-800 bg-[linear-gradient(145deg,#07111f_0%,#0f172a_45%,#1d4ed8_100%)] px-6 py-10 text-center text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:px-8 sm:py-14">
        <SectionEyebrow>Final CTA</SectionEyebrow>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
          Stop wasting hours on reports
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
          Start generating client-ready reports in minutes.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <PrimaryCta>Start free now</PrimaryCta>
        </div>

        <p className="mt-4 text-sm font-medium text-slate-300">
          No credit card required
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 text-sm text-slate-500 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <p>© 2026 Measurable. All rights reserved.</p>
        <div className="flex flex-wrap gap-5">
          <Link href="/privacy-policy" className="transition hover:text-slate-950">
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" className="transition hover:text-slate-950">
            Terms of Service
          </Link>
          <Link href="/" className="transition hover:text-slate-950">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fb] text-slate-950">
      <Navbar />
      <HeroSection />
      <SocialProofSection />
      <ProblemSolutionSection />
      <HowItWorksSection />
      <ProductPreviewSection />
      <FeaturesSection />
      <ValuePropSection />
      <PricingSection />
      <FinalCtaSection />
      <Footer />
    </main>
  );
}
