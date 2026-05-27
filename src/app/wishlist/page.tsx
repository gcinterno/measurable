"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { createWishlistLead } from "@/lib/api/wishlist";
import { useAuthStore } from "@/lib/store/auth-store";

type WishlistPlanOption = "Starter" | "Pro" | "Advanced" | "Aun no estoy seguro";

type WishlistFormState = {
  name: string;
  email: string;
  company: string;
  plan: WishlistPlanOption;
  message: string;
};

const planOptions: WishlistPlanOption[] = [
  "Starter",
  "Pro",
  "Advanced",
  "Aun no estoy seguro",
];

const benefits = [
  {
    title: "50% off anual",
    description: "Accede a precio preferencial durante el lanzamiento.",
    icon: DiscountIcon,
  },
  {
    title: "Reportes con IA",
    description: "Genera reportes visuales y resumenes ejecutivos en minutos.",
    icon: SparkIcon,
  },
  {
    title: "Branding personalizado",
    description: "Presenta reportes con el logo y nombre de tu marca o cliente.",
    icon: BrandIcon,
  },
  {
    title: "Acceso prioritario",
    description: "Obten prioridad para nuevas integraciones, templates y funciones.",
    icon: RocketIcon,
  },
] as const;

const audienceCards = [
  {
    title: "Agencias que reportan resultados a clientes",
    description: "Reduce horas operativas y entrega reportes mas claros, visuales y consistentes.",
  },
  {
    title: "Freelancers que quieren verse mas profesionales",
    description: "Eleva la presentacion de tus resultados sin depender de procesos manuales.",
  },
  {
    title: "Equipos internos que necesitan reportes rapidos",
    description: "Convierte datos dispersos en reportes listos para compartir con direccion o stakeholders.",
  },
] as const;

const faqs = [
  {
    question: "Necesito pagar hoy?",
    answer: "No. La wishlist solo reserva tu acceso a la oferta de lanzamiento.",
  },
  {
    question: "Que incluye el descuento?",
    answer: "Acceso a una membresia anual con 50% de descuento durante el lanzamiento.",
  },
  {
    question: "Para quien es Measurable?",
    answer: "Para agencias, freelancers y equipos que crean reportes de marketing de forma recurrente.",
  },
  {
    question: "Cuando recibire acceso?",
    answer: "Te contactaremos cuando abramos la oferta anual para los usuarios de la wishlist.",
  },
] as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildWishlistMessage(input: { plan: WishlistPlanOption; message: string }) {
  const sections = [`Plan de interes: ${input.plan}`];

  if (input.message.trim()) {
    sections.push(`Tipo de reportes actuales:\n${input.message.trim()}`);
  }

  return sections.join("\n\n");
}

function sectionTitleClasses(inverse = false) {
  return inverse
    ? "text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl"
    : "text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl";
}

function fieldClasses(hasValue: boolean) {
  return `h-14 rounded-2xl border px-4 text-sm outline-none transition ${
    hasValue
      ? "border-slate-300 bg-white text-slate-950"
      : "border-slate-200 bg-slate-50/80 text-slate-950"
  } focus:border-[#2454FF] focus:bg-white focus:ring-4 focus:ring-[#2454FF]/10`;
}

type WishlistFormCardProps = {
  form: WishlistFormState;
  submitting: boolean;
  success: string;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: <Key extends keyof WishlistFormState>(
    key: Key,
    value: WishlistFormState[Key]
  ) => void;
  className?: string;
};

function WishlistFormCard({
  form,
  submitting,
  success,
  error,
  onSubmit,
  onFieldChange,
  className = "",
}: WishlistFormCardProps) {
  return (
    <section
      id="wishlist-form"
      className={`relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:p-8 ${className}`.trim()}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-24 rounded-full bg-[#2454FF]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[#2454FF]/10 blur-3xl" />
      <div className="relative">
        <div className="inline-flex rounded-full border border-[#2454FF]/12 bg-[#2454FF]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2454FF]">
          Reserva tu descuento
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
          Obten 50% off anual
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Unete a la wishlist y te avisaremos cuando abramos el acceso de lanzamiento.
        </p>

        <form onSubmit={(event) => void onSubmit(event)} className="mt-7 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Nombre</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                className={fieldClasses(Boolean(form.name.trim()))}
                placeholder="Tu nombre"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => onFieldChange("email", event.target.value)}
                className={fieldClasses(Boolean(form.email.trim()))}
                placeholder="tu@empresa.com"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Empresa</span>
            <input
              type="text"
              value={form.company}
              onChange={(event) => onFieldChange("company", event.target.value)}
              className={fieldClasses(Boolean(form.company.trim()))}
              placeholder="Nombre de tu empresa o agencia"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Que plan te interesa?</span>
            <select
              value={form.plan}
              onChange={(event) => onFieldChange("plan", event.target.value as WishlistPlanOption)}
              className={`${fieldClasses(true)} appearance-none`}
            >
              {planOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              Mensaje opcional
            </span>
            <textarea
              value={form.message}
              onChange={(event) => onFieldChange("message", event.target.value)}
              rows={5}
              className="min-h-[152px] rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-950 outline-none transition focus:border-[#2454FF] focus:bg-white focus:ring-4 focus:ring-[#2454FF]/10"
              placeholder="Cuentanos que tipo de reportes haces hoy"
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2454FF_0%,#0F67FF_100%)] px-6 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(36,84,255,0.26)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(36,84,255,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Guardando tu lugar..." : "Quiero mi 50% de descuento anual"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-500">
          Sin tarjeta de credito. Cupos limitados.
        </p>

        <div className="mt-5 space-y-2">
          {["50% off anual", "Acceso temprano", "Sin tarjeta de credito"].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm text-slate-700">
              <CheckIcon />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function WishlistPage() {
  const user = useAuthStore((state) => state.user);
  const initialState = useMemo<WishlistFormState>(
    () => ({
      name: user?.name || "",
      email: user?.email || "",
      company: "",
      plan: "Pro",
      message: "",
    }),
    [user?.email, user?.name]
  );
  const [form, setForm] = useState<WishlistFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name || current.name,
      email: user?.email || current.email,
    }));
  }, [user?.email, user?.name]);

  function updateField<Key extends keyof WishlistFormState>(key: Key, value: WishlistFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (!email) {
      setError("El email es obligatorio.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Ingresa un email valido.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await createWishlistLead({
        name,
        email,
        company: form.company.trim(),
        message: buildWishlistMessage({ plan: form.plan, message: form.message }),
        source: "wishlist_launch_offer",
      });
      setSuccess("Estas dentro. Te avisaremos cuando abramos el acceso anual con descuento.");
      setForm((current) => ({
        ...current,
        company: "",
        plan: "Pro",
        message: "",
      }));
    } catch (submitError) {
      console.error("wishlist submit error:", submitError);
      setError("No pudimos registrar tu solicitud. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="relative overflow-hidden bg-[#F6F8FC] pb-20 pt-6 sm:pt-8 lg:pt-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top_left,rgba(36,84,255,0.18),transparent_36%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_28%),linear-gradient(180deg,#020817_0%,rgba(2,8,23,0.94)_32%,rgba(246,248,252,0)_100%)]" />
        <div className="pointer-events-none absolute left-1/2 top-[140px] h-56 w-56 -translate-x-1/2 rounded-full bg-[#2454FF]/15 blur-3xl" />

        <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12">
            <div className="space-y-10">
              <section className="relative overflow-hidden rounded-[36px] border border-white/12 bg-[#020817] px-6 py-7 shadow-[0_28px_90px_rgba(2,8,23,0.32)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(36,84,255,0.22),transparent_24%)]" />
                <div className="relative grid items-center gap-10 xl:grid-cols-[1.08fr_0.92fr]">
                  <div className="max-w-[640px]">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100 backdrop-blur">
                      <span className="h-2 w-2 rounded-full bg-[#60A5FA]" />
                      Early Access · Limited Launch Offer
                    </div>
                    <h1 className="mt-6 max-w-[13ch] text-[2.8rem] font-semibold leading-[0.92] tracking-[-0.07em] text-white sm:text-[4rem] lg:text-[4.6rem]">
                      Obten tu membresia anual con 50% de descuento de lanzamiento
                    </h1>
                    <p className="mt-5 max-w-[60ch] text-base leading-8 text-slate-300 sm:text-lg">
                      Se de los primeros en usar Measurable para crear reportes de marketing con IA, conectar tus plataformas y ahorrar horas cada mes creando presentaciones para clientes.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                      <a
                        href="#wishlist-form"
                        className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2454FF_0%,#3B82F6_100%)] px-6 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(36,84,255,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(36,84,255,0.42)]"
                      >
                        Unirse a la wishlist
                      </a>
                      <a
                        href="#beneficios"
                        className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/12 bg-white/5 px-6 text-sm font-semibold text-white/92 backdrop-blur transition hover:border-white/22 hover:bg-white/10"
                      >
                        Ver beneficios
                      </a>
                    </div>
                    <p className="mt-4 text-sm text-slate-400">
                      Sin tarjeta de credito. Cupos limitados para la primera generacion de usuarios.
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-3 top-12 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white shadow-[0_18px_40px_rgba(2,8,23,0.22)] backdrop-blur md:-left-8">
                      AI Reports
                    </div>
                    <div className="absolute right-0 top-0 rounded-2xl border border-white/10 bg-[#0F172A]/80 px-4 py-3 text-sm text-blue-100 shadow-[0_18px_40px_rgba(2,8,23,0.22)] backdrop-blur md:right-6">
                      PDF / PPTX Export
                    </div>
                    <div className="absolute -bottom-2 left-4 rounded-2xl border border-white/10 bg-[#0B1220]/85 px-4 py-3 text-sm text-slate-200 shadow-[0_18px_40px_rgba(2,8,23,0.22)] backdrop-blur md:left-10">
                      Meta Ads / Instagram
                    </div>
                    <div className="absolute bottom-10 right-2 rounded-2xl border border-[#2454FF]/30 bg-[#2454FF]/14 px-4 py-3 text-sm text-white shadow-[0_18px_40px_rgba(36,84,255,0.18)] backdrop-blur md:right-8">
                      Agency-ready
                    </div>

                    <div className="mx-auto max-w-[460px] rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(2,8,23,0.98)_100%)] p-4 shadow-[0_24px_70px_rgba(2,8,23,0.42)]">
                      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94)_0%,rgba(9,14,29,0.94)_100%)] p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-300">Reporte mensual</p>
                            <p className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-white">
                              Marketing Performance
                            </p>
                          </div>
                          <div className="rounded-full border border-[#2454FF]/30 bg-[#2454FF]/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                            AI Summary
                          </div>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-[1.25fr_0.75fr]">
                          <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                            <div className="flex items-end justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                  Rendimiento
                                </p>
                                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
                                  +28%
                                </p>
                              </div>
                              <span className="rounded-full bg-emerald-500/14 px-3 py-1 text-xs font-semibold text-emerald-300">
                                vs. mes anterior
                              </span>
                            </div>
                            <div className="mt-5 flex h-32 items-end gap-2">
                              {[46, 78, 56, 84, 70, 92, 108].map((value, index) => (
                                <span
                                  key={value}
                                  className={`w-full rounded-t-2xl ${
                                    index === 6
                                      ? "bg-[linear-gradient(180deg,#60A5FA_0%,#2454FF_100%)]"
                                      : "bg-white/10"
                                  }`}
                                  style={{ height: `${value}px` }}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                Canales
                              </p>
                              <div className="mt-4 space-y-3">
                                {[
                                  { label: "Meta Ads", value: "42%" },
                                  { label: "Instagram", value: "31%" },
                                  { label: "CRM", value: "18%" },
                                ].map((channel) => (
                                  <div key={channel.label}>
                                    <div className="flex items-center justify-between text-sm text-slate-300">
                                      <span>{channel.label}</span>
                                      <span className="text-white">{channel.value}</span>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full bg-white/8">
                                      <div
                                        className="h-2 rounded-full bg-[linear-gradient(90deg,#2454FF_0%,#60A5FA_100%)]"
                                        style={{ width: channel.value }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-[24px] border border-[#2454FF]/20 bg-[#2454FF]/10 p-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-blue-100/70">
                                Insight destacado
                              </p>
                              <p className="mt-3 text-sm leading-6 text-blue-50">
                                El resumen ejecutivo detecta variaciones, oportunidades y narrativa lista para presentar.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="lg:hidden">
                <WishlistFormCard
                  form={form}
                  submitting={submitting}
                  success={success}
                  error={error}
                  onSubmit={handleSubmit}
                  onFieldChange={updateField}
                />
              </div>

              <section id="beneficios" className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div className="max-w-[480px]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2454FF]">
                Beneficios de lanzamiento
              </p>
              <h2 className={sectionTitleClasses()}>
                Lo que desbloqueas al entrar primero
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Accede antes que otros equipos a la oferta anual, al onboarding prioritario y a una experiencia pensada para reporting de marketing moderno.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-[#2454FF]/20 hover:shadow-[0_18px_42px_rgba(36,84,255,0.10)]"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(36,84,255,0.12)_0%,rgba(96,165,250,0.16)_100%)] text-[#2454FF]">
                    <benefit.icon />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                    {benefit.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {benefit.description}
                  </p>
                </article>
              ))}
            </div>
              </section>

              <section>
                <div className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="inline-flex rounded-full border border-[#2454FF]/12 bg-[#2454FF]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2454FF]">
                Oferta de lanzamiento anual
              </div>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-slate-950">
                50% OFF
              </h2>
              <p className="mt-2 text-lg font-medium text-slate-700">
                en tu primera membresia anual
              </p>
              <p className="mt-4 max-w-[42ch] text-sm leading-7 text-slate-600">
                Solo para usuarios registrados en la wishlist. No publicaremos esta ventaja de lanzamiento como oferta general.
              </p>

              <div className="mt-6 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Limited spots
              </div>

              <ul className="mt-7 space-y-3">
                {[
                  "Ahorro frente al pago mensual",
                  "Acceso temprano a funciones premium",
                  "Prioridad en onboarding",
                  "Reportes con branding personalizado",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#wishlist-form"
                className="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#08111F_0%,#2454FF_100%)] px-6 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(36,84,255,0.20)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(36,84,255,0.26)] sm:w-auto"
              >
                Reservar mi descuento
              </a>
                </div>
              </section>

              <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-[#020817] px-6 py-8 shadow-[0_24px_70px_rgba(2,8,23,0.18)] sm:px-8 sm:py-10">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="max-w-[480px]">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">
                  Para quien esta hecho
                </p>
                <h2 className={sectionTitleClasses(true)}>
                  Disenado para agencias y equipos de marketing
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-300">
                  Measurable convierte datos de marketing en reportes claros, visuales y accionables.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {audienceCards.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[28px] border border-white/10 bg-white/6 p-6 text-white shadow-[0_18px_40px_rgba(2,8,23,0.18)] backdrop-blur"
                  >
                    <h3 className="text-lg font-semibold tracking-[-0.04em] text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-[460px]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2454FF]">
                FAQ
              </p>
              <h2 className={sectionTitleClasses()}>
                Todo lo necesario para decidir si quieres entrar primero
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Esta lista esta pensada para usuarios interesados en el lanzamiento anual, no para un registro generico.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-[26px] border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-slate-950">
                    {item.question}
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition group-open:rotate-45 group-open:text-[#2454FF]">
                      +
                    </span>
                  </summary>
                  <p className="pt-4 text-sm leading-7 text-slate-600">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-white px-6 py-7 text-center shadow-[0_14px_38px_rgba(15,23,42,0.05)] sm:px-8 sm:py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2454FF]">
              Lanzamiento Measurable
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
              Tu acceso con descuento empieza aqui
            </h2>
            <p className="mx-auto mt-4 max-w-[54ch] text-sm leading-7 text-slate-600 sm:text-base">
              Si estas evaluando una forma mas rapida y presentable de entregar reportes de marketing, esta es la mejor forma de entrar primero.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="#wishlist-form"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#08111F_0%,#2454FF_100%)] px-6 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(36,84,255,0.20)] transition hover:-translate-y-0.5"
              >
                Unirme ahora
              </a>
              <Link
                href="/pricing"
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ver planes
              </Link>
            </div>
              </section>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <div className="pointer-events-none absolute inset-x-8 top-8 h-24 rounded-full bg-[#2454FF]/10 blur-3xl" />
                <div className="max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
                  <WishlistFormCard
                    form={form}
                    submitting={submitting}
                    success={success}
                    error={error}
                    onSubmit={handleSubmit}
                    onFieldChange={updateField}
                  />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600">
      <path
        d="M4.75 10.5 8 13.75l7.25-7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DiscountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M7 7h.01M17 17h.01M8 16 16 8M6.5 3h5.17a2 2 0 0 1 1.42.59l7.32 7.32a2 2 0 0 1 0 2.82l-6.28 6.28a2 2 0 0 1-2.82 0L3.99 12.7A2 2 0 0 1 3.4 11.3V6.5A3.5 3.5 0 0 1 6.5 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2ZM5.5 14l1.1 3 3 1.1-3 1.1-1.1 3-1.1-3-3-1.1 3-1.1 1.1-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BrandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5H16l4 4v7.5A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 13h8M8 16h5M16 5v4h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M14.5 9.5 9 15l-4 1 1-4 5.5-5.5A7.78 7.78 0 0 1 20 4a7.78 7.78 0 0 1-2.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12 6 18M14 6h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
