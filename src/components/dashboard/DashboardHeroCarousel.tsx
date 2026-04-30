"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/components/providers/LanguageProvider";

type DashboardHeroCarouselProps = {
  userName: string;
};

export function DashboardHeroCarousel({
  userName,
}: DashboardHeroCarouselProps) {
  const { messages } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = [
    {
      title: messages.dashboard.hero1Title,
      description: messages.dashboard.hero1Description,
      background:
        "bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.28),transparent_30%),linear-gradient(135deg,#0f172a_0%,#13213f_48%,#2563eb_145%)]",
    },
    {
      title: messages.dashboard.hero2Title,
      description: messages.dashboard.hero2Description,
      background:
        "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),linear-gradient(135deg,#172554_0%,#0f172a_45%,#1d4ed8_100%)]",
    },
    {
      title: messages.dashboard.hero3Title,
      description: messages.dashboard.hero3Description,
      background:
        "bg-[radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.22),transparent_32%),linear-gradient(135deg,#111827_0%,#1e293b_50%,#0f766e_140%)]",
    },
  ] as const;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  const activeSlide = slides[activeIndex];

  return (
    <section
      className={`relative overflow-hidden rounded-[32px] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-8 ${activeSlide.background}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.22))]" />
      <div className="relative">
        <p className="text-sm font-medium text-sky-200">{messages.dashboard.hello}, {userName}</p>
        <div className="mt-4 max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {activeSlide.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base">
            {activeSlide.description}
          </p>
        </div>

        <div className="mt-8 flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`${messages.dashboard.goToSlide} ${index + 1}`}
              className={`h-2.5 rounded-full transition ${
                index === activeIndex
                  ? "w-10 bg-white"
                  : "w-2.5 bg-white/35 hover:bg-white/55"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
