"use client";

import { useEffect, useState } from "react";

type DashboardHeroCarouselProps = {
  userName: string;
};

const slides = [
  {
    title: "Espacio para tu arte principal",
    description:
      "Aqui puedes reemplazar esta primera pieza por tu diseno grafico interno cuando subas los banners finales.",
    background:
      "bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.28),transparent_30%),linear-gradient(135deg,#0f172a_0%,#13213f_48%,#2563eb_145%)]",
  },
  {
    title: "Carrusel listo para campañas y storytelling",
    description:
      "La estructura ya esta preparada para funcionar como hero slider con varias piezas visuales del equipo.",
    background:
      "bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),linear-gradient(135deg,#172554_0%,#0f172a_45%,#1d4ed8_100%)]",
  },
  {
    title: "Sustituye estas slides por creativos reales",
    description:
      "Cuando subas tus imagenes, este mismo bloque puede quedar como carrusel principal del inicio.",
    background:
      "bg-[radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.22),transparent_32%),linear-gradient(135deg,#111827_0%,#1e293b_50%,#0f766e_140%)]",
  },
] as const;

export function DashboardHeroCarousel({
  userName,
}: DashboardHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

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
        <p className="text-sm font-medium text-sky-200">Hola, {userName}</p>
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
              aria-label={`Ir a slide ${index + 1}`}
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
