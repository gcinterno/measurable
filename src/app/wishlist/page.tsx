"use client";

import { FormEvent, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { createWishlistLead } from "@/lib/api/wishlist";
import { useAuthStore } from "@/lib/store/auth-store";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function WishlistPage() {
  const user = useAuthStore((state) => state.user);
  const initialState = useMemo(
    () => ({
      name: user?.name || "",
      email: user?.email || "",
      company: "",
      message: "",
    }),
    [user?.email, user?.name]
  );
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

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
      setError("Ingresa un email válido.");
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
        message: form.message.trim(),
        source: "upgrade_page",
      });
      setSuccess("Gracias, te agregamos a la wishlist.");
      setForm((current) => ({
        ...current,
        company: "",
        message: "",
      }));
    } catch (submitError) {
      console.error("wishlist submit error:", submitError);
      setError("No pudimos enviarte a la wishlist. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#08111f_0%,#12306d_52%,#f8fbff_52%,#ffffff_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col justify-between px-6 py-8 text-white sm:px-8 sm:py-10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200">
                  Premium access
                </p>
                <h1 className="mt-4 max-w-[14ch] text-[2.5rem] font-semibold leading-[0.94] tracking-[-0.05em] sm:text-[3.4rem]">
                  Upgrade your plan
                </h1>
                <p className="mt-5 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
                  Únete a la wishlist para acceder primero a los planes premium de Measurable.
                </p>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {[
                  "Más reportes y automatización",
                  "Templates premium",
                  "Acceso prioritario a nuevas funciones",
                  "Workflows más avanzados para equipos",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur"
                  >
                    <p className="text-sm text-white/92">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-6 py-8 sm:px-8 sm:py-10">
              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700">Nombre</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, name: event.target.value }));
                        setError("");
                        setSuccess("");
                      }}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700">Email</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, email: event.target.value }));
                        setError("");
                        setSuccess("");
                      }}
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Empresa</span>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, company: event.target.value }));
                      setError("");
                      setSuccess("");
                    }}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Mensaje / Qué plan te interesa</span>
                  <textarea
                    value={form.message}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, message: event.target.value }));
                      setError("");
                      setSuccess("");
                    }}
                    rows={6}
                    className="min-h-[152px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                {error ? (
                  <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                {success ? (
                  <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {success}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#08111f_0%,#1d4ed8_100%)] px-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(29,78,216,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Enviando..." : "Join Wishlist"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
