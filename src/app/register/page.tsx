"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { useI18n } from "@/components/providers/LanguageProvider";
import { RegisterApiError, registerUser } from "@/lib/api/auth";

export default function RegisterPage() {
  const { messages } = useI18n();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setError("");
    setSuccess("");
  }, []);

  function validateForm() {
    if (!email.trim()) {
      return messages.register.emailRequired;
    }

    if (!password) {
      return messages.register.passwordRequired;
    }

    if (password.length < 8) {
      return messages.register.passwordMin;
    }

    if (!confirmPassword) {
      return messages.register.confirmPasswordRequired;
    }

    if (password !== confirmPassword) {
      return messages.register.passwordMismatch;
    }

    return "";
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await registerUser({
        email: email.trim(),
        password,
        fullName: fullName.trim() || undefined,
      });

      setSuccess(messages.register.success);
      window.setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof RegisterApiError) {
        if (err.status === 409) {
          setError(messages.register.emailAlreadyRegistered);
        } else if (err.status === 400) {
          setError(err.message || messages.register.validationError);
        } else {
          setError(err.message || messages.register.genericError);
        }
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(messages.register.genericError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard requireAuth={false} redirectTo="/dashboard">
      <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-2">
        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
          <div className="w-full max-w-md text-center">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                Measurable
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {messages.register.title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                {messages.register.description}
              </p>
            </div>

            <form
              onSubmit={handleRegister}
              className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-8 text-left shadow-sm"
            >
              <input
                type="text"
                placeholder={messages.register.fullNameOptional}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />

              <input
                type="email"
                placeholder={messages.register.email}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <input
                type="password"
                placeholder={messages.register.password}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <input
                type="password"
                placeholder={messages.register.confirmPassword}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? messages.register.creatingAccount : messages.register.createAccount}
              </button>

              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}

              {success ? (
                <p className="text-sm text-emerald-600">{success}</p>
              ) : null}

              <div className="pt-2 text-center">
                <p className="text-sm text-slate-500">
                  {messages.register.alreadyHaveAccount}{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-sky-700 transition hover:text-sky-800"
                  >
                    {messages.register.signIn}
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </section>

        <aside className="hidden border-l border-white/60 bg-[linear-gradient(135deg,#e0f2fe_0%,#f8fafc_48%,#ffffff_100%)] lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-16 lg:py-14 xl:px-20">
          <div className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              {messages.login.platformUpdates}
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {messages.login.updatesTitle}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              {messages.login.updatesDescription}
            </p>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/70 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-sm font-semibold text-slate-950">
              {messages.login.comingSoon}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {messages.login.comingSoonDescription}
            </p>
          </div>
        </aside>
      </div>
    </AuthGuard>
  );
}
