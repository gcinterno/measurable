"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { createWishlistLead } from "@/lib/api/wishlist";
import { useAuthStore } from "@/lib/store/auth-store";

type WishlistPlanOption = "Starter" | "Pro" | "Advanced" | "Not sure yet";

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
  "Not sure yet",
];

const infoItems = [
  {
    title: "What you get",
    body: "Access to the launch offer with 50% off your annual membership.",
  },
  {
    title: "Do I need to pay today?",
    body: "No. You’re only signing up to get early access when the offer opens.",
  },
  {
    title: "Who it’s for",
    body: "For agencies, freelancers, and teams that create marketing reports on a recurring basis.",
  },
] as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildWishlistMessage(input: { plan: WishlistPlanOption; message: string }) {
  const sections = [`Plan of interest: ${input.plan}`];

  if (input.message.trim()) {
    sections.push(`Current report types:\n${input.message.trim()}`);
  }

  return sections.join("\n\n");
}

function fieldClasses(hasValue: boolean) {
  return `h-14 rounded-2xl border px-4 text-sm outline-none transition ${
    hasValue
      ? "border-slate-300 bg-white text-slate-950"
      : "border-slate-200 bg-slate-50/90 text-slate-950"
  } focus:border-[#2454FF] focus:bg-white focus:ring-4 focus:ring-[#2454FF]/10`;
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
      setError("Name is required.");
      return;
    }

    if (!email) {
      setError("Email is required.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Enter a valid email.");
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
      setSuccess("You’re in. We’ll let you know when annual access opens with 50% off.");
      setForm((current) => ({
        ...current,
        company: "",
        plan: "Pro",
        message: "",
      }));
    } catch (submitError) {
      console.error("wishlist submit error:", submitError);
      setError("We couldn’t register your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="relative overflow-hidden bg-[#F6F8FC] pb-16 pt-8 lg:pt-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-[radial-gradient(circle_at_top_left,rgba(36,84,255,0.12),transparent_32%),linear-gradient(180deg,#F8FAFD_0%,rgba(246,248,252,0)_100%)]" />
        <div className="pointer-events-none absolute left-1/2 top-24 h-44 w-44 -translate-x-1/2 rounded-full bg-[#2454FF]/8 blur-3xl" />

        <div className="relative mx-auto max-w-[760px] px-4 sm:px-6">
          <section className="text-center">
            <div className="inline-flex rounded-full border border-[#2454FF]/10 bg-[#2454FF]/6 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2454FF]">
              Early Access · Launch Offer
            </div>
            <h1 className="mx-auto mt-5 max-w-[12ch] text-[2.7rem] font-semibold leading-[0.94] tracking-[-0.07em] text-slate-950 sm:text-[3.6rem]">
              Get 50% off your annual membership
            </h1>
            <p className="mx-auto mt-4 max-w-[58ch] text-base leading-8 text-slate-600 sm:text-lg">
              Join the Measurable wishlist and be among the first to access AI-powered marketing reports, custom branding, and premium features for agencies.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Limited spots during launch.
            </p>
          </section>

          <section
            id="wishlist-form"
            className="relative mt-8 overflow-hidden rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-8"
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-[#2454FF]/10 blur-3xl" />
            <div className="relative">
              <div className="inline-flex rounded-full border border-[#2454FF]/12 bg-[#2454FF]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2454FF]">
                Reserve your discount
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                Get 50% off annually
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Leave your details and we’ll notify you when discounted annual access opens.
              </p>

              <form onSubmit={(event) => void handleSubmit(event)} className="mt-7 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700">Name</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      className={fieldClasses(Boolean(form.name.trim()))}
                      placeholder="Your name"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700">Email</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      className={fieldClasses(Boolean(form.email.trim()))}
                      placeholder="tu@empresa.com"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-slate-700">Company</span>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(event) => updateField("company", event.target.value)}
                    className={fieldClasses(Boolean(form.company.trim()))}
                    placeholder="Your company or agency name"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700">Which plan are you interested in?</span>
                  <select
                    value={form.plan}
                    onChange={(event) => updateField("plan", event.target.value as WishlistPlanOption)}
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
                    Tell us what kind of reports you create today
                  </span>
                  <textarea
                    value={form.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    rows={4}
                    className="min-h-[132px] rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm leading-7 text-slate-950 outline-none transition focus:border-[#2454FF] focus:bg-white focus:ring-4 focus:ring-[#2454FF]/10"
                    placeholder="E.g. monthly reports, executive summaries, channel performance..."
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
                  className="inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#08111F_0%,#2454FF_100%)] px-6 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(36,84,255,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(36,84,255,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Saving your spot..." : "Get 50% off annually"}
                </button>
              </form>

              <p className="mt-4 text-sm text-slate-500">
                No credit card required. Early access only.
              </p>
            </div>
          </section>

          <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.04)] sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2454FF]">
              Quick info
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {infoItems.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
